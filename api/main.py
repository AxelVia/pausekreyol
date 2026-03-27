"""
PauseKreyol — Backend FastAPI
Lance avec : uvicorn api.main:app --reload
"""

import os
import io
import json
import shutil
import logging
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s"
)

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler

import sys
sys.path.append(str(Path(__file__).parent.parent))
from engine.template_engine import (
    create_client_folder,
    create_project,
    list_clients,
    CLIENTS_DIR,
)
from engine.excel_reader import read_client_summary, read_alerts

logger = logging.getLogger(__name__)

# ── Scheduler ─────────────────────────────────────────────────────────────────

def run_gmail_agent():
    """Tâche planifiée — tourne toutes les 5 minutes en prod."""
    try:
        from engine.gmail_agent import run_agent
        run_agent()
    except Exception as e:
        logger.error(f"Erreur agent Gmail : {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crée le dossier clients/ au démarrage
    CLIENTS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Dossier clients créé : {CLIENTS_DIR}")

    # Debug variables d'environnement
    gmail_token = os.getenv("GMAIL_REFRESH_TOKEN")
    env = os.getenv("ENV")
    logger.info(f"ENV={env} | GMAIL_REFRESH_TOKEN présent={bool(gmail_token)}")

    # Restaure les métadonnées clients depuis Drive au démarrage
    if env == "production" and os.getenv("GOOGLE_DRIVE_FOLDER_ID"):
        try:
            from engine.drive_storage import load_all_clients_from_drive
            clients = load_all_clients_from_drive()
            for meta in clients:
                # Recrée la structure exacte attendue par list_clients()
                # CLIENTS_DIR / slug / client.json
                slug = meta.get("slug", "")
                if not slug:
                    continue
                # Cherche un dossier existant avec ce slug ou en crée un
                matches = list(CLIENTS_DIR.glob(f"{slug}*"))
                if matches:
                    client_dir = matches[0]
                else:
                    client_dir = CLIENTS_DIR / slug
                    client_dir.mkdir(parents=True, exist_ok=True)
                    (client_dir / "projets").mkdir(exist_ok=True)

                (client_dir / "client.json").write_text(
                    json.dumps(meta, ensure_ascii=False, indent=2)
                )
            logger.info(f"{len(clients)} client(s) restauré(s) depuis Drive")
        except Exception as e:
            logger.error(f"Erreur restauration Drive : {e}")

    scheduler = None
    if env == "production" and gmail_token:
        scheduler = BackgroundScheduler()
        scheduler.add_job(run_gmail_agent, "interval", minutes=5, id="gmail_agent")
        scheduler.start()
        logger.info("Agent Gmail démarré — cycle toutes les 5 minutes")
    else:
        logger.warning(f"Agent Gmail NON démarré — ENV={env}, token={'ok' if gmail_token else 'MANQUANT'}")
    yield
    if scheduler:
        scheduler.shutdown()


app = FastAPI(title="PauseKreyol API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modèles ──────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    type_structure: str = "asso_france"
    nom_officiel: str
    nom_usuel: Optional[str] = None
    # France
    siret: Optional[str] = None
    code_ape: Optional[str] = None
    numero_rna: Optional[str] = None
    licence_type1: Optional[str] = None
    licence_type2: Optional[str] = None
    licence_type3: Optional[str] = None
    # Sénégal
    ninea: Optional[str] = None
    rccm: Optional[str] = None
    capital_social: Optional[str] = None
    # Commun
    date_creation: Optional[str] = None
    adresse_siege: Optional[str] = None
    president: Optional[str] = None
    tresorier: Optional[str] = None
    directeur_artistique: Optional[str] = None
    email_contact: Optional[str] = None
    telephone: Optional[str] = None


class ProjectCreate(BaseModel):
    nom_projet: str
    date_debut_projet: Optional[str] = None
    date_fin_projet: Optional[str] = None
    lieu_projet: Optional[str] = None
    code_aap: Optional[str] = None


# ── Routes clients ────────────────────────────────────────────────────────────

@app.get("/clients")
def get_clients():
    """Liste tous les clients."""
    return list_clients()


@app.post("/clients", status_code=201)
def post_client(data: ClientCreate):
    """Crée un nouveau dossier client avec les Excel pré-remplis."""
    try:
        client_dir = create_client_folder(data.model_dump())
        meta = json.loads((client_dir / "client.json").read_text())
        return {"status": "created", "slug": meta["slug"], "dossier": str(client_dir)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/clients/{slug}")
def get_client(slug: str):
    """Retourne les détails d'un client."""
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    meta_path = matches[0] / "client.json"
    return json.loads(meta_path.read_text())


@app.get("/clients/{slug}/summary")
def get_client_summary(slug: str):
    """Lit les données clés de l'Excel Association pour le dashboard."""
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    try:
        return read_client_summary(client_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/clients/{slug}")
def patch_client(slug: str, body: dict):
    """Met à jour les données d'un client (infos + emails surveillés)."""
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    meta_path = client_dir / "client.json"
    meta = json.loads(meta_path.read_text())

    # Sauvegarde les anciennes valeurs pour le journal
    old_data = dict(meta["client_data"])

    # Met à jour client_data
    meta["client_data"].update(body)

    # Historisation
    try:
        from engine.historisation import append_event, add_timestamps
        changes = {k: {"avant": old_data.get(k), "après": v}
                   for k, v in body.items() if old_data.get(k) != v}
        meta = add_timestamps(meta, "modification_infos", {"champs_modifiés": list(changes.keys())})
        append_event(client_dir, "modification_infos", {"modifications": changes})
    except Exception as e:
        logger.warning(f"Historisation PATCH ignorée : {e}")

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    # Sync Drive
    try:
        from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json
        client_folder_id = meta.get("drive_folder_id")
        if client_folder_id:
            meta_id = drive_find_file("client.json", client_folder_id)
            if meta_id:
                drive_update_json(meta_id, meta)
            else:
                drive_upload_json(meta, "client.json", client_folder_id)
    except Exception as e:
        logger.warning(f"Drive sync après PATCH : {e}")

    return meta


@app.delete("/clients/{slug}")
def delete_client(slug: str, confirm: str = ""):
    """
    Supprime un client. Nécessite confirm=SUPPRIMER pour procéder.
    Archive le dossier Drive avant suppression.
    """
    if confirm != "SUPPRIMER":
        raise HTTPException(
            status_code=400,
            detail="Ajoutez ?confirm=SUPPRIMER pour confirmer la suppression."
        )

    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    meta_path = client_dir / "client.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    # Archive sur Drive avant suppression
    try:
        from engine.historisation import archive_client_before_delete, append_event
        append_event(client_dir, "suppression", {"slug": slug})
        archive_client_before_delete(slug, meta)
    except Exception as e:
        logger.warning(f"Archivage avant suppression : {e}")

    # Supprime localement
    shutil.rmtree(client_dir, ignore_errors=True)

    return {"status": "supprimé", "slug": slug, "archivé": True}


@app.get("/clients/{slug}/alertes")
def get_client_alerts(slug: str):
    """Retourne les alertes de conformité du client (caisses, licences...)."""
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    try:
        return read_alerts(client_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Routes projets ────────────────────────────────────────────────────────────

@app.post("/clients/{slug}/projets", status_code=201)
def post_project(slug: str, data: ProjectCreate):
    """Crée un nouveau projet pour un client existant."""
    try:
        projet_dir = create_project(slug, data.model_dump())
        return {"status": "created", "dossier": str(projet_dir)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dashboard global ──────────────────────────────────────────────────────────

@app.get("/templates/doc-synchronisation")
def download_doc_sync():
    """Télécharge la documentation de synchronisation."""
    from fastapi.responses import FileResponse
    doc_path = Path(__file__).parent.parent / "templates" / "DOC_SYNCHRONISATION.xlsx"
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail="Documentation non trouvée")
    return FileResponse(
        str(doc_path),
        filename="DOC_SYNCHRONISATION_PauseKreyol.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.get("/templates/collecte-client")
def download_collecte_client():
    """Télécharge le template de collecte client à envoyer aux prospects."""
    from fastapi.responses import FileResponse
    path = Path(__file__).parent.parent / "templates" / "TEMPLATE_COLLECTE_CLIENT.xlsx"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template non trouvé")
    return FileResponse(
        str(path),
        filename="COLLECTE_CLIENT_PauseKreyol.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.get("/dashboard")
def get_dashboard():
    clients = list_clients()
    all_alerts = []

    for client in clients:
        slug = client["slug"]
        matches = list(CLIENTS_DIR.glob(f"{slug}*"))
        if not matches:
            continue
        client_dir = matches[0]
        try:
            # Essaie de lire l'Excel local
            alerts = read_alerts(client_dir)
            # Si vide, essaie de télécharger depuis Drive
            if not alerts:
                meta_path = client_dir / "client.json"
                if meta_path.exists():
                    meta = json.loads(meta_path.read_text())
                    drive_asso_id = meta.get("drive_asso_id")
                    if drive_asso_id and os.getenv("ENV") == "production":
                        try:
                            from engine.drive_storage import _get_service
                            import tempfile as tmpmod
                            service = _get_service()
                            content = service.files().get_media(fileId=drive_asso_id).execute()
                            with tmpmod.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                                tmp.write(content)
                                tmp_path = Path(tmp.name)
                            # Sauvegarde local pour la prochaine fois
                            asso_files = list(client_dir.glob("STRUCTURE_*.xlsx"))
                            if not asso_files:
                                import shutil
                                shutil.copy(tmp_path, client_dir / f"STRUCTURE_{slug}.xlsx")
                            alerts = read_alerts(client_dir)
                            Path(tmp_path).unlink(missing_ok=True)
                        except Exception as e:
                            logger.warning(f"Drive download pour alertes {slug} : {e}")

            for a in alerts:
                a["client"] = client["nom"]
                a["slug"] = slug
            all_alerts.extend(alerts)
        except Exception:
            pass

    priority = {"EXPIRÉ": 0, "URGENT": 1, "Attention": 2, "OK": 3, "—": 4}
    all_alerts.sort(key=lambda x: priority.get(x.get("statut", "—"), 4))

    # Compte les subventions dans le pipeline
    nb_subventions = 0
    for client in clients:
        matches = list(CLIENTS_DIR.glob(f"{client['slug']}*"))
        if matches:
            meta_path = matches[0] / "client.json"
            if meta_path.exists():
                meta = json.loads(meta_path.read_text())
                for p in meta.get("projets", []):
                    nb_subventions += len(p.get("subventions", []))

    return {
        "nb_clients": len(clients),
        "nb_alertes_urgentes": sum(1 for a in all_alerts if a.get("statut") in ("EXPIRÉ", "URGENT")),
        "nb_subventions": nb_subventions,
        "clients": clients,
        "alertes": all_alerts,
    }


@app.get("/")
def root():
    return {"message": "PauseKreyol API", "version": "0.1.0", "docs": "/docs"}


# ── Routes tâches ─────────────────────────────────────────────────────────────

TASKS_FILE = CLIENTS_DIR / "tasks.json"


@app.get("/taches")
def get_taches():
    """Retourne toutes les tâches."""
    if not TASKS_FILE.exists():
        return []
    return json.loads(TASKS_FILE.read_text())


@app.patch("/taches/{task_id}")
def update_tache(task_id: str, body: dict):
    """Met à jour une tâche (ex: marquer comme done)."""
    if not TASKS_FILE.exists():
        raise HTTPException(status_code=404, detail="Aucune tâche")
    tasks = json.loads(TASKS_FILE.read_text())
    for t in tasks:
        if t["id"] == task_id:
            t.update(body)
            TASKS_FILE.write_text(json.dumps(tasks, ensure_ascii=False, indent=2))
            return t
    raise HTTPException(status_code=404, detail="Tâche non trouvée")


@app.post("/agent/run")
def trigger_agent():
    """Déclenche manuellement un cycle de l'agent Gmail."""
    try:
        from engine.gmail_agent import run_agent
        tasks = run_agent()
        return {"status": "ok", "new_tasks": len(tasks or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Routes projet ─────────────────────────────────────────────────────────────

def _get_projet(slug: str, slug_projet: str):
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    meta_path = client_dir / "client.json"
    meta = json.loads(meta_path.read_text())
    projet = next((p for p in meta.get("projets", []) if p["slug"] == slug_projet), None)
    if not projet:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    return client_dir, meta_path, meta, projet


@app.patch("/clients/{slug}/projets/{slug_projet}/statut")
def update_projet_statut(slug: str, slug_projet: str, body: dict):
    """Met à jour le statut d'un projet."""
    client_dir, meta_path, meta, projet = _get_projet(slug, slug_projet)
    new_statut = body.get("statut")
    if not new_statut:
        raise HTTPException(status_code=400, detail="statut requis")

    for p in meta["projets"]:
        if p["slug"] == slug_projet:
            p["statut"] = new_statut
            p["statut_updated_at"] = datetime.now().isoformat()
            break

    try:
        from engine.historisation import append_event, add_timestamps
        meta = add_timestamps(meta, "changement_statut_projet", {
            "projet": slug_projet, "nouveau_statut": new_statut
        })
        append_event(client_dir, "changement_statut_projet", {
            "projet": slug_projet, "statut": new_statut
        })
    except Exception as e:
        logger.warning(f"Historisation statut : {e}")

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    # Sync Drive
    try:
        from engine.drive_storage import drive_find_file, drive_update_json
        meta_id = drive_find_file("client.json", meta.get("drive_folder_id", ""))
        if meta_id:
            drive_update_json(meta_id, meta)
    except Exception as e:
        logger.warning(f"Drive sync statut : {e}")

    return {"status": "updated", "nouveau_statut": new_statut}


@app.post("/clients/{slug}/projets/{slug_projet}/subventions")
def add_subvention(slug: str, slug_projet: str, body: dict):
    """Ajoute une demande de subvention à un projet."""
    client_dir, meta_path, meta, projet = _get_projet(slug, slug_projet)

    sub = {
        "id": int(datetime.now().timestamp() * 1000),
        "created_at": datetime.now().isoformat(),
        "financeur": body.get("financeur", ""),
        "montant_demande": body.get("montant_demande", 0),
        "montant_accorde": body.get("montant_accorde", 0),
        "deadline": body.get("deadline"),
        "statut": body.get("statut", "À préparer"),
        "notes": body.get("notes", ""),
    }

    for p in meta["projets"]:
        if p["slug"] == slug_projet:
            if "subventions" not in p:
                p["subventions"] = []
            p["subventions"].append(sub)
            break

    try:
        from engine.historisation import append_event, add_timestamps
        meta = add_timestamps(meta, "ajout_subvention", {
            "projet": slug_projet, "financeur": sub["financeur"],
            "montant": sub["montant_demande"]
        })
        append_event(client_dir, "ajout_subvention", {
            "projet": slug_projet, "financeur": sub["financeur"],
            "montant_demande": sub["montant_demande"],
        })
    except Exception as e:
        logger.warning(f"Historisation subvention : {e}")

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    try:
        from engine.drive_storage import drive_find_file, drive_update_json
        meta_id = drive_find_file("client.json", meta.get("drive_folder_id", ""))
        if meta_id:
            drive_update_json(meta_id, meta)
    except Exception as e:
        logger.warning(f"Drive sync subvention : {e}")

    return sub


@app.post("/clients/{slug}/projets/{slug_projet}/sync")
def sync_projet(slug: str, slug_projet: str):
    """
    Analyse les Excel Association + Projet via Claude.
    Détecte les incohérences et crée une tâche de validation.
    """
    client_dir, meta_path, meta, projet = _get_projet(slug, slug_projet)
    cd = meta.get("client_data", {})

    # ── Collecte les données de référence depuis client.json ──────────────
    asso_data = {
        "nom_officiel": cd.get("nom_officiel"),
        "siret": cd.get("siret"),
        "licence_type1": cd.get("licence_type1"),
        "president": cd.get("president"),
        "email_contact": cd.get("email_contact"),
        "adresse_siege": cd.get("adresse_siege"),
    }

    projet_data = {
        "nom": projet.get("nom"),
        "lieu": projet.get("lieu"),
        "dates": projet.get("dates", {}),
        "code_aap": projet.get("code_aap"),
        "subventions": projet.get("subventions", []),
        "statut": projet.get("statut"),
    }

    # ── Essaie de lire les Excel depuis Drive ─────────────────────────────
    excel_summaries = {}
    drive_info = projet.get("drive", {})

    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import _get_service
            service = _get_service()

            for label, file_id in [
                ("asso", meta.get("drive_asso_id")),
                ("subvention", drive_info.get("dossier_subvention_id")),
                ("prospect", drive_info.get("fiche_prospect_id")),
            ]:
                if not file_id:
                    continue
                try:
                    content = service.files().get_media(fileId=file_id).execute()
                    import tempfile as tmp_mod
                    with tmp_mod.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                        tmp.write(content)
                        tmp_path = Path(tmp.name)
                    from engine.excel_reader import read_client_summary
                    if label == "asso":
                        summary = read_client_summary(tmp_path.parent)
                    else:
                        from openpyxl import load_workbook
                        wb = load_workbook(str(tmp_path), data_only=True)
                        summary = {s: {} for s in wb.sheetnames}
                        for sname in wb.sheetnames[:3]:
                            ws = wb[sname]
                            rows = []
                            for row in ws.iter_rows(max_row=8, values_only=True):
                                vals = [str(v) for v in row if v is not None]
                                if vals:
                                    rows.append(vals[:4])
                            summary[sname] = rows
                    excel_summaries[label] = summary
                    Path(tmp_path).unlink(missing_ok=True)
                except Exception as e:
                    logger.warning(f"Lecture Excel {label} : {e}")
        except Exception as e:
            logger.warning(f"Drive auth pour sync : {e}")

    # ── Analyse Claude ────────────────────────────────────────────────────
    import anthropic as anthropic_sdk
    ai = anthropic_sdk.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

    prompt = f"""Tu es l'assistant de Pause Kreyol, une administratrice de production culturelle.

Analyse la cohérence entre les données de l'Association et du Projet.

DONNÉES ASSOCIATION (référence) :
{json.dumps(asso_data, ensure_ascii=False, indent=2)}

DONNÉES PROJET :
{json.dumps(projet_data, ensure_ascii=False, indent=2)}

RÉSUMÉS EXCEL :
{json.dumps(excel_summaries, ensure_ascii=False, indent=2) if excel_summaries else "Non disponibles (mode dev)"}

Vérifie :
1. Les infos de l'asso (SIRET, nom, contacts) sont-elles cohérentes dans les fichiers projet ?
2. Le statut du projet est-il cohérent avec les subventions et les dates ?
3. Des données importantes semblent-elles manquantes ou incohérentes ?
4. Le bilan de l'asso devrait-il être mis à jour (si le projet est "réalisé") ?

Réponds UNIQUEMENT en JSON valide :
{{
  "nb_ecarts": <nombre>,
  "ecarts": [
    {{
      "description": "Description courte de l'écart",
      "fichier": "Association ou Projet",
      "champ": "nom du champ concerné",
      "valeur_asso": "valeur dans l'asso",
      "valeur_projet": "valeur dans le projet",
      "action_suggeree": "ce qu'il faudrait faire"
    }}
  ],
  "analyse_claude": "Résumé en 2-3 phrases de l'état de synchronisation",
  "mise_a_jour_asso_requise": true/false,
  "actions_prioritaires": ["action 1", "action 2"]
}}"""

    try:
        response = ai.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        analyse = json.loads(raw)
    except Exception as e:
        analyse = {
            "nb_ecarts": 0,
            "ecarts": [],
            "analyse_claude": f"Analyse non disponible : {e}",
            "mise_a_jour_asso_requise": False,
            "actions_prioritaires": [],
        }

    # ── Crée une tâche si des écarts sont détectés ────────────────────────
    task_id = None
    if analyse.get("nb_ecarts", 0) > 0:
        task = {
            "id": f"task_sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "created_at": datetime.now().isoformat(),
            "source": "Synchronisation",
            "titre": f"Synchroniser les données — {projet.get('nom')} / {cd.get('nom_usuel') or cd.get('nom_officiel')}",
            "priorite": "Attention",
            "description": analyse.get("analyse_claude", ""),
            "client_detecte": cd.get("nom_usuel") or cd.get("nom_officiel"),
            "client_slug": slug,
            "type": "sync_excel",
            "actions_suggerees": analyse.get("actions_prioritaires", []),
            "impacts_detectes": [e.get("champ") for e in analyse.get("ecarts", [])],
            "changements": {e.get("champ"): {
                "avant": e.get("valeur_projet"),
                "après": e.get("valeur_asso"),
                "action": e.get("action_suggeree"),
            } for e in analyse.get("ecarts", []) if e.get("champ")},
            "nouvelles_donnees": asso_data,
            "done": False,
        }
        tasks_file = CLIENTS_DIR / "tasks.json"
        tasks = json.loads(tasks_file.read_text()) if tasks_file.exists() else []
        tasks.append(task)
        tasks_file.write_text(json.dumps(tasks, ensure_ascii=False, indent=2))
        task_id = task["id"]

    return {
        **analyse,
        "task_id": task_id,
    }


@app.patch("/clients/{slug}/projets/{slug_projet}/subventions/{sub_id}")
def update_subvention(slug: str, slug_projet: str, sub_id: int, body: dict):
    """Met à jour une subvention (statut, montant accordé...)."""
    client_dir, meta_path, meta, projet = _get_projet(slug, slug_projet)

    for p in meta["projets"]:
        if p["slug"] == slug_projet:
            for s in p.get("subventions", []):
                if s["id"] == sub_id:
                    s.update(body)
                    s["updated_at"] = datetime.now().isoformat()
                    break
            break

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    try:
        from engine.drive_storage import drive_find_file, drive_update_json
        meta_id = drive_find_file("client.json", meta.get("drive_folder_id", ""))
        if meta_id:
            drive_update_json(meta_id, meta)
    except Exception as e:
        logger.warning(f"Drive sync subvention update : {e}")

    return {"status": "updated"}


# ── Import Excel ──────────────────────────────────────────────────────────────

@app.post("/import/parse")
async def parse_excel_upload(file: UploadFile = File(...)):
    """Parse un Excel uploadé et retourne les données extraites — prévisualisation sans création."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier Excel requis (.xlsx)")
    try:
        from engine.excel_parser import parse_excel_bytes
        content = await file.read()
        result = parse_excel_bytes(content, file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/import/create-client")
async def create_client_from_excel(file: UploadFile = File(...)):
    """Parse l'Excel et crée le dossier client — appelé après validation."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier Excel requis (.xlsx)")
    try:
        from engine.excel_parser import parse_excel_bytes
        content = await file.read()
        parsed = parse_excel_bytes(content, file.filename)

        if parsed.get("source") == "error":
            raise HTTPException(status_code=400, detail=parsed.get("error", "Erreur parsing"))
        if not parsed["client_data"].get("nom_officiel"):
            raise HTTPException(status_code=400, detail="Nom officiel manquant dans le fichier")

        client_dir = create_client_folder(parsed["client_data"])
        meta = json.loads((client_dir / "client.json").read_text())

        if parsed.get("projet_data") and parsed["projet_data"].get("nom_projet"):
            try:
                create_project(meta["slug"], parsed["projet_data"])
                meta = json.loads((client_dir / "client.json").read_text())
            except Exception as e:
                logger.warning(f"Projet non créé depuis import : {e}")

        return {
            "status": "created",
            "slug": meta["slug"],
            "nom": parsed["client_data"].get("nom_officiel"),
            "champs_importes": len(parsed["client_data"]),
            "projet_cree": bool(parsed.get("projet_data", {}) and parsed["projet_data"].get("nom_projet")),
            "source": parsed.get("source"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/import/update-client/{slug}")
async def update_client_from_excel(slug: str, file: UploadFile = File(...)):
    """
    Parse l'Excel et retourne le diff avec les données existantes.
    Crée une tâche de validation — ne modifie pas encore le client.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier Excel requis (.xlsx)")

    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    meta = json.loads((client_dir / "client.json").read_text())

    try:
        from engine.excel_parser import parse_excel_client, diff_with_existing
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)
        parsed = parse_excel_client(tmp_path)
        tmp_path.unlink()

        if parsed.get("erreur"):
            raise HTTPException(status_code=400, detail=parsed["erreur"])

        # Calcule le diff
        changes = diff_with_existing(parsed, meta["client_data"])

        if not changes:
            return {"status": "no_changes", "message": "Aucune modification détectée"}

        # Crée une tâche de validation
        from datetime import datetime
        task = {
            "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "created_at": datetime.now().isoformat(),
            "source": "Import Excel",
            "titre": f"Valider les modifications Excel — {meta['client_data'].get('nom_usuel') or meta['client_data'].get('nom_officiel')}",
            "priorite": "Attention",
            "description": f"{len(changes)} champ(s) modifié(s) détecté(s) dans le fichier importé.",
            "client_detecte": meta["client_data"].get("nom_usuel") or meta["client_data"].get("nom_officiel"),
            "client_slug": slug,
            "type": "validation_import",
            "actions_suggerees": [f"Vérifier : {k} → '{v['après']}'" for k, v in list(changes.items())[:5]],
            "impacts_detectes": list(changes.keys()),
            "changements": changes,
            "nouvelles_donnees": parsed["client_data"],
            "done": False,
        }

        tasks_file = CLIENTS_DIR / "tasks.json"
        tasks = json.loads(tasks_file.read_text()) if tasks_file.exists() else []
        tasks.append(task)
        tasks_file.write_text(json.dumps(tasks, ensure_ascii=False, indent=2))

        return {
            "status": "task_created",
            "task_id": task["id"],
            "nb_changes": len(changes),
            "changes": changes,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/taches/{task_id}/valider")
def valider_tache(task_id: str):
    """
    Valide une tâche de type validation_import.
    Applique les modifications au dossier client.
    """
    if not TASKS_FILE.exists():
        raise HTTPException(status_code=404, detail="Tâche non trouvée")

    tasks = json.loads(TASKS_FILE.read_text())
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")

    if task.get("type") == "validation_import" and task.get("client_slug"):
        slug = task["client_slug"]
        nouvelles_donnees = task.get("nouvelles_donnees", {})

        matches = list(CLIENTS_DIR.glob(f"{slug}*"))
        if matches:
            client_dir = matches[0]
            meta_path = client_dir / "client.json"
            meta = json.loads(meta_path.read_text())

            old_data = dict(meta["client_data"])
            meta["client_data"].update(nouvelles_donnees)

            # Historisation
            try:
                from engine.historisation import append_event, add_timestamps
                changes = task.get("changements", {})
                meta = add_timestamps(meta, "modification_import_excel", {
                    "champs": list(changes.keys()),
                    "task_id": task_id,
                })
                append_event(client_dir, "modification_import_excel", {
                    "modifications": changes,
                    "source": "Import Excel validé",
                })
            except Exception as e:
                logger.warning(f"Historisation validation : {e}")

            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

            # Sync Drive
            try:
                from engine.drive_storage import drive_find_file, drive_update_json
                client_folder_id = meta.get("drive_folder_id")
                if client_folder_id:
                    meta_id = drive_find_file("client.json", client_folder_id)
                    if meta_id:
                        drive_update_json(meta_id, meta)
            except Exception as e:
                logger.warning(f"Drive sync après validation : {e}")

    # Marque la tâche comme faite
    task["done"] = True
    task["validated_at"] = datetime.now().isoformat() if 'datetime' in dir() else ""
    TASKS_FILE.write_text(json.dumps(tasks, ensure_ascii=False, indent=2))

    return {"status": "validated", "task_id": task_id}
