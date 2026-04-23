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
from datetime import datetime, timedelta
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


def _check_relances_auto():
    """
    Job planifié toutes les 12h : vérifie les échéances devis/factures
    et crée les tâches de relance J-7, J-1, J, J+7 si pas encore créées.
    """
    try:
        today = datetime.now().date()
        devis = _load_devis()
        factures = _load_factures()
        tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
        existing_task_refs = {t.get("facture_id") or t.get("devis_id") for t in tasks}

        new_tasks = []

        # Relances factures : J-7, J-1, J, J+7
        for f in factures:
            if f.get("statut") not in ("envoyée",):
                continue
            if not f.get("date_echeance"):
                continue
            try:
                echeance = datetime.strptime(f["date_echeance"], "%d/%m/%Y").date()
            except Exception:
                continue
            diff = (echeance - today).days
            fid = f["id"]
            nom = f.get("client_nom", "?")
            numero = f.get("numero", "?")
            montant = f.get("total_ht", 0)
            montant_maj = round(montant * 1.10, 2)

            # Vérifie que la tâche pour ce jour précis n'existe pas
            jour_key = f"relance_{fid}_{diff}j"
            existing_keys = {t.get("jour_key") for t in tasks}

            if diff == 7 and jour_key not in existing_keys:
                new_tasks.append({
                    "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_r7",
                    "created_at": datetime.now().isoformat(),
                    "source": "Scheduler", "categorie": "finance",
                    "titre": f"Relance paiement J-7 — {nom} ({numero})",
                    "priorite": "Attention",
                    "description": f"Facture {numero} ({montant}€) à échéance dans 7 jours ({f['date_echeance']}).",
                    "client_slug": f.get("client_slug"), "client_nom": nom,
                    "facture_id": fid, "jour_key": jour_key, "done": False, "auto": True,
                })
            elif diff == 1 and jour_key not in existing_keys:
                new_tasks.append({
                    "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_r1",
                    "created_at": datetime.now().isoformat(),
                    "source": "Scheduler", "categorie": "finance",
                    "titre": f"⚠️ Relance paiement J-1 — {nom} ({numero})",
                    "priorite": "URGENT",
                    "description": f"Facture {numero} ({montant}€) expire DEMAIN ({f['date_echeance']}). Pénalités : {montant_maj}€ si retard.",
                    "client_slug": f.get("client_slug"), "client_nom": nom,
                    "facture_id": fid, "jour_key": jour_key, "done": False, "auto": True,
                })
            elif diff == 0 and jour_key not in existing_keys:
                new_tasks.append({
                    "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_r0",
                    "created_at": datetime.now().isoformat(),
                    "source": "Scheduler", "categorie": "finance",
                    "titre": f"🚨 Facture impayée aujourd'hui — {nom} ({numero})",
                    "priorite": "URGENT",
                    "description": f"Facture {numero} ({montant}€) arrive à échéance AUJOURD'HUI. Pénalités applicables : +{montant_maj}€.",
                    "client_slug": f.get("client_slug"), "client_nom": nom,
                    "facture_id": fid, "jour_key": jour_key, "done": False, "auto": True,
                })
            elif diff == -7 and jour_key not in existing_keys:
                # J+7 : crée aussi la facture de majoration
                facture_maj = _create_facture_majoration(f)
                new_tasks.append({
                    "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_r_7",
                    "created_at": datetime.now().isoformat(),
                    "source": "Scheduler", "categorie": "finance",
                    "titre": f"🚨 URGENT — Impayé J+7 — {nom} ({numero})",
                    "priorite": "URGENT",
                    "description": (
                        f"Facture {numero} impayée depuis 7 jours. "
                        f"Facture majoration 10% créée ({facture_maj['numero']}). "
                        f"Procédure de recouvrement à engager."
                    ),
                    "client_slug": f.get("client_slug"), "client_nom": nom,
                    "facture_id": fid, "facture_maj_id": facture_maj["id"],
                    "jour_key": jour_key, "done": False, "auto": True,
                })

        # Relances devis : date limite signature dépassée
        for d in devis:
            if d.get("statut") != "envoyé" or d.get("archived"):
                continue
            if not d.get("date_limite_signature"):
                continue
            try:
                limite = datetime.strptime(d["date_limite_signature"], "%d/%m/%Y").date()
            except Exception:
                continue
            diff = (limite - today).days
            did = d["id"]
            nom = d.get("client_nom", "?")
            numero = d.get("numero", "?")
            jour_key = f"relance_devis_{did}_{diff}j"
            existing_keys = {t.get("jour_key") for t in tasks}
            if diff == 3 and jour_key not in existing_keys:
                new_tasks.append({
                    "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_rd3",
                    "created_at": datetime.now().isoformat(),
                    "source": "Scheduler", "categorie": "devis",
                    "titre": f"Relancer devis J-3 — {nom} ({numero})",
                    "priorite": "Attention",
                    "description": f"Le devis {numero} expire dans 3 jours ({d['date_limite_signature']}). Relancer {nom}.",
                    "client_slug": d.get("client_slug"), "devis_id": did,
                    "jour_key": jour_key, "done": False, "auto": True,
                })

        if new_tasks:
            tasks.extend(new_tasks)
            _save_tasks(tasks)
            logger.info(f"Scheduler relances : {len(new_tasks)} tâche(s) créée(s)")
        else:
            logger.info("Scheduler relances : aucune nouvelle tâche")

    except Exception as e:
        logger.error(f"Erreur scheduler relances : {e}")


def _restore_devis_factures_drive():
    """Sync bidirectionnel devis.json + factures.json avec Drive.
    - Si le fichier local est absent : restaure depuis Drive
    - Toujours : backup local → Drive
    """
    try:
        if os.getenv("ENV") != "production":
            return
        from engine.drive_storage import drive_download_json, drive_find_file, drive_upload_json, drive_update_json, get_root_folder_id
        root_id = get_root_folder_id()

        # Restore Drive → local si fichier absent
        if not DEVIS_FILE.exists():
            devis_data = drive_download_json("devis.json", root_id)
            if devis_data:
                DEVIS_FILE.parent.mkdir(parents=True, exist_ok=True)
                DEVIS_FILE.write_text(json.dumps(devis_data, ensure_ascii=False, indent=2))
        if not FACTURES_FILE.exists():
            factures_data = drive_download_json("factures.json", root_id)
            if factures_data:
                FACTURES_FILE.parent.mkdir(parents=True, exist_ok=True)
                FACTURES_FILE.write_text(json.dumps(factures_data, ensure_ascii=False, indent=2))
        if not SUBVENTIONS_FILE.exists():
            sub_data = drive_download_json("subventions.json", root_id)
            if sub_data:
                SUBVENTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
                SUBVENTIONS_FILE.write_text(json.dumps(sub_data, ensure_ascii=False, indent=2))
        if not ANNUAIRE_FILE.exists():
            ann_data = drive_download_json("annuaire.json", root_id)
            if ann_data:
                ANNUAIRE_FILE.parent.mkdir(parents=True, exist_ok=True)
                ANNUAIRE_FILE.write_text(json.dumps(ann_data, ensure_ascii=False, indent=2))
        if not CAMPAIGNS_FILE.exists():
            camp_data = drive_download_json("campaigns.json", root_id)
            if camp_data:
                CAMPAIGNS_FILE.parent.mkdir(parents=True, exist_ok=True)
                CAMPAIGNS_FILE.write_text(json.dumps(camp_data, ensure_ascii=False, indent=2))
        if not COMM_FILE.exists():
            comm_data = drive_download_json("comm.json", root_id)
            if comm_data:
                COMM_FILE.parent.mkdir(parents=True, exist_ok=True)
                COMM_FILE.write_text(json.dumps(comm_data, ensure_ascii=False, indent=2))

        # Backup local → Drive
        if DEVIS_FILE.exists():
            devis = json.loads(DEVIS_FILE.read_text())
            fid = drive_find_file("devis.json", root_id)
            if fid:
                drive_update_json(fid, devis)
            else:
                drive_upload_json(devis, "devis.json", root_id)
        if FACTURES_FILE.exists():
            factures = json.loads(FACTURES_FILE.read_text())
            fid = drive_find_file("factures.json", root_id)
            if fid:
                drive_update_json(fid, factures)
            else:
                drive_upload_json(factures, "factures.json", root_id)
        if TASKS_FILE.exists():
            tasks = json.loads(TASKS_FILE.read_text())
            fid = drive_find_file("tasks.json", root_id)
            if fid:
                drive_update_json(fid, tasks)
            else:
                drive_upload_json(tasks, "tasks.json", root_id)
        if SUBVENTIONS_FILE.exists():
            subventions = json.loads(SUBVENTIONS_FILE.read_text())
            fid = drive_find_file("subventions.json", root_id)
            if fid:
                drive_update_json(fid, subventions)
            else:
                drive_upload_json(subventions, "subventions.json", root_id)
        if ANNUAIRE_FILE.exists():
            annuaire = json.loads(ANNUAIRE_FILE.read_text())
            fid = drive_find_file("annuaire.json", root_id)
            if fid:
                drive_update_json(fid, annuaire)
            else:
                drive_upload_json(annuaire, "annuaire.json", root_id)
        if CAMPAIGNS_FILE.exists():
            campaigns = json.loads(CAMPAIGNS_FILE.read_text())
            fid = drive_find_file("campaigns.json", root_id)
            if fid:
                drive_update_json(fid, campaigns)
            else:
                drive_upload_json(campaigns, "campaigns.json", root_id)
        if COMM_FILE.exists():
            comm_data = json.loads(COMM_FILE.read_text())
            fid = drive_find_file("comm.json", root_id)
            if fid:
                drive_update_json(fid, comm_data)
            else:
                drive_upload_json(comm_data, "comm.json", root_id)
        # Backup RH
        if RH_FILE.exists():
            rh_data = json.loads(RH_FILE.read_text())
            fid = drive_find_file("rh_data.json", root_id)
            if fid: drive_update_json(fid, rh_data)
            else: drive_upload_json(rh_data, "rh_data.json", root_id)
        if ARTISTES_FILE.exists():
            art_data = json.loads(ARTISTES_FILE.read_text())
            fid = drive_find_file("rh_artistes.json", root_id)
            if fid: drive_update_json(fid, art_data)
            else: drive_upload_json(art_data, "rh_artistes.json", root_id)
        logger.info("Sync nightly globale ↔ Drive OK")
    except Exception as e:
        logger.warning(f"Sync Drive nightly : {e}")


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

        # Restaure tasks.json depuis Drive
        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            tasks_data = drive_download_json("tasks.json", root_id)
            if tasks_data:
                TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
                TASKS_FILE.write_text(json.dumps(tasks_data, ensure_ascii=False, indent=2))
        except Exception as e:
            pass

        # Restaure subventions.json et annuaire.json
        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            sub_data = drive_download_json("subventions.json", root_id)
            if sub_data:
                SUBVENTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
                SUBVENTIONS_FILE.write_text(json.dumps(sub_data, ensure_ascii=False, indent=2))
            ann_data = drive_download_json("annuaire.json", root_id)
            if ann_data:
                ANNUAIRE_FILE.parent.mkdir(parents=True, exist_ok=True)
                ANNUAIRE_FILE.write_text(json.dumps(ann_data, ensure_ascii=False, indent=2))
        except Exception as e:
            pass

        # Restaure devis.json depuis Drive
        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            devis_data = drive_download_json("devis.json", root_id)
            if devis_data:
                DEVIS_FILE.parent.mkdir(parents=True, exist_ok=True)
                DEVIS_FILE.write_text(json.dumps(devis_data, ensure_ascii=False, indent=2))
                logger.info(f"devis.json restauré depuis Drive ({len(devis_data)} devis)")
        except Exception as e:
            logger.warning(f"devis.json non restauré : {e}")

        # Restaure factures.json depuis Drive
        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            factures_data = drive_download_json("factures.json", root_id)
            if factures_data:
                FACTURES_FILE.parent.mkdir(parents=True, exist_ok=True)
                FACTURES_FILE.write_text(json.dumps(factures_data, ensure_ascii=False, indent=2))
                logger.info(f"factures.json restauré depuis Drive ({len(factures_data)} factures)")
        except Exception as e:
            logger.warning(f"factures.json non restauré : {e}")

        # Restaure processed_emails.json depuis Drive
        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            processed = drive_download_json(".processed_emails.json", root_id)
            if processed:
                pe_path = CLIENTS_DIR / ".processed_emails.json"
                pe_path.write_text(json.dumps(processed, ensure_ascii=False))
                logger.info("processed_emails.json restauré depuis Drive")
        except Exception as e:
            logger.warning(f"processed_emails.json non restauré : {e}")

        # Restaure rh_data.json + rh_artistes.json depuis Drive
        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            rh_data_drive = drive_download_json("rh_data.json", root_id)
            if rh_data_drive:
                RH_FILE.parent.mkdir(parents=True, exist_ok=True)
                RH_FILE.write_text(json.dumps(rh_data_drive, ensure_ascii=False, indent=2))
                logger.info(f"rh_data.json restauré depuis Drive ({len(rh_data_drive)} structures)")
        except Exception as e:
            logger.warning(f"rh_data.json non restauré : {e}")

        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            rh_artistes_drive = drive_download_json("rh_artistes.json", root_id)
            if rh_artistes_drive:
                ARTISTES_FILE.parent.mkdir(parents=True, exist_ok=True)
                ARTISTES_FILE.write_text(json.dumps(rh_artistes_drive, ensure_ascii=False, indent=2))
                logger.info(f"rh_artistes.json restauré depuis Drive ({len(rh_artistes_drive)} artistes)")
        except Exception as e:
            logger.warning(f"rh_artistes.json non restauré : {e}")

        try:
            from engine.drive_storage import drive_download_json, get_root_folder_id
            root_id = get_root_folder_id()
            rh_res_drive = drive_download_json("rh_residences.json", root_id)
            if rh_res_drive:
                RESIDENCES_FILE.parent.mkdir(parents=True, exist_ok=True)
                RESIDENCES_FILE.write_text(json.dumps(rh_res_drive, ensure_ascii=False, indent=2))
                logger.info(f"rh_residences.json restauré depuis Drive ({len(rh_res_drive)} résidences)")
        except Exception as e:
            logger.warning(f"rh_residences.json non restauré : {e}")

    scheduler = None
    if env == "production" and gmail_token:
        scheduler = BackgroundScheduler()
        scheduler.add_job(run_gmail_agent, "interval", minutes=5, id="gmail_agent")
        scheduler.add_job(_check_relances_auto, "interval", hours=12, id="relances_auto")
        scheduler.add_job(_restore_devis_factures_drive, "cron", hour=3, minute=0, id="restore_drive_nightly")
        scheduler.start()
        logger.info("Scheduler démarré — Gmail 5min, Relances 12h, Restore Drive 3h00")
    else:
        logger.warning(f"Agent Gmail NON démarré — ENV={env}, token={'ok' if gmail_token else 'MANQUANT'}")
    yield
    if scheduler:
        scheduler.shutdown()


app = FastAPI(title="PauseKreyol API", version="0.1.0", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://pausekreyol.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.getenv("ENV") != "production" else [FRONTEND_URL],
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


@app.get("/clients/{slug}/sync-check")
def check_client_drive_sync(slug: str):
    """
    Vérifie la cohérence entre le dossier local et Drive pour un client.
    Retourne l'état de chaque fichier et déclenche une re-sync si nécessaire.
    """
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    meta_path = client_dir / "client.json"
    meta = json.loads(meta_path.read_text())

    result = {
        "slug": slug,
        "nom": meta.get("client_data", {}).get("nom_usuel") or meta.get("client_data", {}).get("nom_officiel"),
        "drive_folder_id": meta.get("drive_folder_id"),
        "fichiers": {},
        "actions": [],
    }

    if os.getenv("ENV") != "production":
        result["message"] = "Sync Drive disponible uniquement en production"
        return result

    try:
        from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, drive_get_or_create_folder, get_root_folder_id
        root_id = get_root_folder_id()

        # Vérifie / crée le dossier Drive
        folder_id = meta.get("drive_folder_id")
        if not folder_id:
            folder_id = drive_get_or_create_folder(slug, root_id)
            meta["drive_folder_id"] = folder_id
            result["actions"].append("Dossier Drive créé")

        # Fichiers à vérifier
        fichiers_locaux = {
            "client.json": meta_path,
            **{f.name: f for f in client_dir.glob("*.xlsx")},
        }

        for nom_fichier, chemin in fichiers_locaux.items():
            file_id = drive_find_file(nom_fichier, folder_id)
            if file_id:
                result["fichiers"][nom_fichier] = {"drive": "✅ présent", "drive_id": file_id}
            else:
                # Upload manquant
                if nom_fichier == "client.json":
                    drive_upload_json(meta, nom_fichier, folder_id)
                else:
                    from engine.drive_storage import drive_upload_bytes
                    drive_upload_bytes(chemin.read_bytes(), nom_fichier, folder_id)
                result["fichiers"][nom_fichier] = {"drive": "⬆️ uploadé (manquait)"}
                result["actions"].append(f"{nom_fichier} uploadé sur Drive")

        # Sauvegarde meta si folder_id ajouté
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        result["status"] = "ok" if not result["actions"] else "repaired"

    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


@app.post("/clients/{slug}/sync-drive")
def force_sync_client_drive(slug: str):
    """Force une re-synchronisation complète local → Drive pour un client."""
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    meta_path = client_dir / "client.json"
    meta = json.loads(meta_path.read_text())

    synced = []
    errors = []

    try:
        from engine.drive_storage import (
            drive_find_file, drive_update_json, drive_upload_json,
            drive_upload_bytes, drive_get_or_create_folder, get_root_folder_id
        )
        root_id = get_root_folder_id()
        folder_id = meta.get("drive_folder_id") or drive_get_or_create_folder(slug, root_id)
        meta["drive_folder_id"] = folder_id

        # client.json
        fid = drive_find_file("client.json", folder_id)
        if fid:
            drive_update_json(fid, meta)
        else:
            drive_upload_json(meta, "client.json", folder_id)
        synced.append("client.json")

        # Tous les xlsx du dossier
        for xlsx in client_dir.glob("*.xlsx"):
            fid = drive_find_file(xlsx.name, folder_id)
            if not fid:
                drive_upload_bytes(xlsx.read_bytes(), xlsx.name, folder_id)
                synced.append(xlsx.name)

        # Dossier projets
        projets_dir = client_dir / "projets"
        if projets_dir.exists():
            projets_folder_id = meta.get("drive_projets_folder_id") or drive_get_or_create_folder("projets", folder_id)
            meta["drive_projets_folder_id"] = projets_folder_id
            for xlsx in projets_dir.glob("**/*.xlsx"):
                fid = drive_find_file(xlsx.name, projets_folder_id)
                if not fid:
                    drive_upload_bytes(xlsx.read_bytes(), xlsx.name, projets_folder_id)
                    synced.append(f"projets/{xlsx.name}")

        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    except Exception as e:
        errors.append(str(e))
        logger.error(f"Force sync {slug} : {e}")

    return {"status": "ok" if not errors else "partial", "synced": synced, "errors": errors}


@app.patch("/clients/{slug}/archive")
def toggle_archive_client(slug: str, body: dict):
    """Archive ou désarchive un client. body: {archived: true/false}"""
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client_dir = matches[0]
    meta_path = client_dir / "client.json"
    meta = json.loads(meta_path.read_text())

    meta["archived"] = bool(body.get("archived", True))
    meta["archived_at"] = datetime.now().isoformat() if meta["archived"] else None
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    # Sync Drive
    try:
        from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json
        folder_id = meta.get("drive_folder_id")
        if folder_id:
            fid = drive_find_file("client.json", folder_id)
            if fid:
                drive_update_json(fid, meta)
    except Exception as e:
        logger.warning(f"Drive sync archive : {e}")

    action = "archivé" if meta["archived"] else "désarchivé"
    logger.info(f"Client {slug} {action}")
    return {"status": action, "archived": meta["archived"]}


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

    # Suppression en cascade des entités liées
    try:
        # Tâches
        if TASKS_FILE.exists():
            tasks = json.loads(TASKS_FILE.read_text())
            old_len = len(tasks)
            tasks = [t for t in tasks if t.get("client_slug") != slug]
            if len(tasks) < old_len:
                _save_tasks(tasks)
        
        # Devis
        if DEVIS_FILE.exists():
            devis = json.loads(DEVIS_FILE.read_text())
            old_len = len(devis)
            devis = [d for d in devis if d.get("client_slug") != slug]
            if len(devis) < old_len:
                _save_devis(devis)

        # Factures
        if FACTURES_FILE.exists():
            factures = json.loads(FACTURES_FILE.read_text())
            old_len = len(factures)
            factures = [f for f in factures if f.get("client_slug") != slug]
            if len(factures) < old_len:
                _save_factures(factures)

        # Subventions
        if SUBVENTIONS_FILE.exists():
            subs = json.loads(SUBVENTIONS_FILE.read_text())
            old_len = len(subs)
            subs = [s for s in subs if s.get("client_slug") != slug]
            if len(subs) < old_len:
                _save_subventions(subs)
                
    except Exception as e:
        logger.warning(f"Erreur suppression en cascade pour {slug}: {e}")

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

@app.get("/templates/fiche-client-v2")
def download_fiche_client_v2():
    """Télécharge le template FICHE_CLIENT_V2 à envoyer aux prospects."""
    from fastapi.responses import FileResponse
    path = Path(__file__).parent.parent / "templates" / "TEMPLATE_FICHE_CLIENT_V2.xlsx"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template non trouvé")
    return FileResponse(
        str(path),
        filename="FICHE_CLIENT_PauseKreyol_V2.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


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
SUBVENTIONS_FILE = CLIENTS_DIR / "subventions.json"
ANNUAIRE_FILE = CLIENTS_DIR / "annuaire.json"
CAMPAIGNS_FILE = CLIENTS_DIR / "campaigns.json"
COMM_FILE = CLIENTS_DIR / "comm.json"

def _load_subventions() -> list:
    if SUBVENTIONS_FILE.exists():
        return json.loads(SUBVENTIONS_FILE.read_text())
    return []

def _save_subventions(subventions: list):
    SUBVENTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SUBVENTIONS_FILE.write_text(json.dumps(subventions, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_upload_json, drive_find_file, drive_update_json, get_root_folder_id
            root_id = get_root_folder_id()
            file_id = drive_find_file("subventions.json", root_id)
            if file_id:
                drive_update_json(file_id, subventions)
            else:
                drive_upload_json(subventions, "subventions.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync subventions.json : {e}")

def _load_annuaire() -> list:
    if ANNUAIRE_FILE.exists():
        return json.loads(ANNUAIRE_FILE.read_text())
    return []

def _save_annuaire(annuaire: list):
    ANNUAIRE_FILE.parent.mkdir(parents=True, exist_ok=True)
    ANNUAIRE_FILE.write_text(json.dumps(annuaire, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_upload_json, drive_find_file, drive_update_json, get_root_folder_id
            root_id = get_root_folder_id()
            file_id = drive_find_file("annuaire.json", root_id)
            if file_id:
                drive_update_json(file_id, annuaire)
            else:
                drive_upload_json(annuaire, "annuaire.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync annuaire.json : {e}")

def _load_campaigns() -> list:
    if CAMPAIGNS_FILE.exists():
        return json.loads(CAMPAIGNS_FILE.read_text())
    return []

def _save_campaigns(campaigns: list):
    CAMPAIGNS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CAMPAIGNS_FILE.write_text(json.dumps(campaigns, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_upload_json, drive_find_file, drive_update_json, get_root_folder_id
            root_id = get_root_folder_id()
            file_id = drive_find_file("campaigns.json", root_id)
            if file_id:
                drive_update_json(file_id, campaigns)
            else:
                drive_upload_json(campaigns, "campaigns.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync campaigns.json : {e}")

def _load_comm() -> dict:
    if COMM_FILE.exists():
        return json.loads(COMM_FILE.read_text())
    return {"charte": None, "assets": []}

def _save_comm(data: dict):
    COMM_FILE.parent.mkdir(parents=True, exist_ok=True)
    COMM_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_upload_json, drive_find_file, drive_update_json, get_root_folder_id
            root_id = get_root_folder_id()
            file_id = drive_find_file("comm.json", root_id)
            if file_id:
                drive_update_json(file_id, data)
            else:
                drive_upload_json(data, "comm.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync comm.json : {e}")

def _save_campaigns(campaigns: list):
    CAMPAIGNS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CAMPAIGNS_FILE.write_text(json.dumps(campaigns, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_upload_json, drive_find_file, drive_update_json, get_root_folder_id
            root_id = get_root_folder_id()
            file_id = drive_find_file("campaigns.json", root_id)
            if file_id:
                drive_update_json(file_id, campaigns)
            else:
                drive_upload_json(campaigns, "campaigns.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync campaigns.json : {e}")

def _save_tasks(tasks: list):
    """Sauvegarde tasks.json localement et sur Drive."""
    TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TASKS_FILE.write_text(json.dumps(tasks, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_upload_json, drive_find_file, drive_update_json, get_root_folder_id
            root_id = get_root_folder_id()
            file_id = drive_find_file("tasks.json", root_id)
            if file_id:
                drive_update_json(file_id, tasks)
            else:
                drive_upload_json(tasks, "tasks.json", root_id)
        except Exception as e:
            logger.warning(f"tasks.json non sauvegardé sur Drive : {e}")


@app.get("/taches")
def get_taches():
    """Retourne toutes les tâches."""
    if not TASKS_FILE.exists():
        return []
    return json.loads(TASKS_FILE.read_text())


@app.post("/taches")
def create_tache(body: dict):
    """Crée une tâche manuellement."""
    task = {
        "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_manual",
        "created_at": datetime.now().isoformat(),
        "source": "Manuel",
        "titre": body.get("titre", "Sans titre"),
        "priorite": body.get("priorite", "Normal"),
        "description": body.get("description", ""),
        "deadline": body.get("deadline"),
        "client_detecte": body.get("client_detecte"),
        "client_slug": body.get("client_slug"),
        "categorie": body.get("categorie", "admin"),
        "type": body.get("type", "manuel"),
        "done": False,
    }
    tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
    tasks.append(task)
    _save_tasks(tasks)
    return task


@app.patch("/taches/{task_id}")
def update_tache(task_id: str, body: dict):
    """Met à jour une tâche (ex: marquer comme done)."""
    if not TASKS_FILE.exists():
        raise HTTPException(status_code=404, detail="Aucune tâche")
    tasks = json.loads(TASKS_FILE.read_text())
    for t in tasks:
        if t["id"] == task_id:
            t.update(body)
            _save_tasks(tasks)
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


@app.delete("/clients/{slug}/projets/{slug_projet}")
def delete_projet(slug: str, slug_projet: str):
    """Supprime un projet du dossier client. Ne supprime PAS le client."""
    client_dir, meta_path, meta, projet = _get_projet(slug, slug_projet)
    nom_projet = projet.get("nom", slug_projet)

    # Retire le projet de la liste
    meta["projets"] = [p for p in meta["projets"] if p["slug"] != slug_projet]

    # Historisation avant suppression
    try:
        from engine.historisation import append_event
        append_event(client_dir, "suppression_projet", {
            "projet_slug": slug_projet,
            "projet_nom": nom_projet,
        })
    except Exception:
        pass

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    logger.info(f"Projet {slug_projet} supprimé du client {slug}")
    return {"status": "deleted", "projet": slug_projet, "client": slug}


@app.patch("/clients/{slug}/projets/{slug_projet}/statut")
def update_projet_statut(slug: str, slug_projet: str, body: dict):
    """Met à jour le statut d'un projet. Si 'réalisé', déclenche la rétroaction vers l'Association."""
    client_dir, meta_path, meta, projet = _get_projet(slug, slug_projet)
    new_statut = body.get("statut")
    if not new_statut:
        raise HTTPException(status_code=400, detail="statut requis")

    old_statut = projet.get("statut")

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

    # ── Rétroaction Projet → Association si statut = réalisé ──────────────
    retroaction_info = None
    if new_statut == "realise" and old_statut != "realise":
        try:
            retroaction_info = _retroaction_projet_asso(meta, projet, client_dir, meta_path)
        except Exception as e:
            logger.warning(f"Rétroaction projet→asso : {e}")

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    # Sync Drive
    try:
        from engine.drive_storage import drive_find_file, drive_update_json
        meta_id = drive_find_file("client.json", meta.get("drive_folder_id", ""))
        if meta_id:
            drive_update_json(meta_id, meta)
    except Exception as e:
        logger.warning(f"Drive sync statut : {e}")

    return {"status": "updated", "nouveau_statut": new_statut, "retroaction": retroaction_info}


def _retroaction_projet_asso(meta: dict, projet: dict, client_dir, meta_path) -> dict:
    """
    Quand un projet passe à 'réalisé' :
    - Calcule le total subventions accordées + montant billetterie du projet
    - Met à jour le bilan N de l'association dans client.json
    - Crée une tâche pour mettre à jour l'Excel Association sur Drive
    """
    cd = meta.get("client_data", {})
    nom_projet = projet.get("nom", "?")
    nom_client = cd.get("nom_usuel") or cd.get("nom_officiel", "?")

    # Calcule les totaux du projet
    subventions = projet.get("subventions", [])
    total_accorde = sum(float(s.get("montant_accorde") or 0) for s in subventions)
    total_demande = sum(float(s.get("montant_demande") or 0) for s in subventions)
    nb_subventions = len([s for s in subventions if s.get("statut") in ("Accordée", "Versée")])

    # Enrichit le projet avec le résumé financier
    for p in meta["projets"]:
        if p["slug"] == projet["slug"]:
            p["bilan_financier"] = {
                "total_subventions_demandees": total_demande,
                "total_subventions_accordees": total_accorde,
                "nb_subventions_obtenues": nb_subventions,
                "date_realisation": datetime.now().strftime("%d/%m/%Y"),
            }
            break

    # Met à jour l'historique projets réalisés dans client_data
    historique = cd.setdefault("historique_projets", [])
    historique.append({
        "nom": nom_projet,
        "slug": projet["slug"],
        "date_realisation": datetime.now().strftime("%d/%m/%Y"),
        "total_subventions_accordees": total_accorde,
        "nb_subventions": nb_subventions,
    })
    cd["historique_projets"] = historique[-20:]  # Garde les 20 derniers

    # Crée une tâche pour mettre à jour l'Excel Association
    tache_info = {
        "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_retroaction",
        "created_at": datetime.now().isoformat(),
        "source": "Rétroaction projet",
        "titre": f"Mettre à jour le bilan Association — {nom_client} après {nom_projet}",
        "priorite": "Attention",
        "categorie": "admin",
        "description": (
            f"Le projet '{nom_projet}' est marqué comme réalisé. "
            f"Mettre à jour l'onglet BILAN ASSO et HISTORIQUE de l'Excel Association sur Drive. "
            f"Subventions accordées : {total_accorde:,.0f} € sur {total_demande:,.0f} € demandés "
            f"({nb_subventions} subvention(s) obtenue(s))."
        ),
        "client_detecte": nom_client,
        "client_slug": meta["slug"],
        "type": "validation",
        "done": False,
        "retroaction": True,
        "projet_slug": projet["slug"],
        "montants": {
            "total_accorde": total_accorde,
            "total_demande": total_demande,
            "nb_subventions": nb_subventions,
        }
    }

    tasks_file = CLIENTS_DIR / "tasks.json"
    tasks = json.loads(tasks_file.read_text()) if tasks_file.exists() else []
    tasks.append(tache_info)
    _save_tasks(tasks)

    logger.info(f"Rétroaction : {nom_projet} réalisé — tâche MAJ bilan asso créée")

    # Sync Drive automatique du client.json mis à jour
    try:
        if os.getenv("ENV") == "production":
            from engine.drive_storage import drive_find_file, drive_update_json
            folder_id = meta.get("drive_folder_id", "")
            if folder_id:
                file_id = drive_find_file("client.json", folder_id)
                if file_id:
                    drive_update_json(file_id, meta)
                    logger.info(f"Drive sync client.json après réalisation {nom_projet}")
    except Exception as e:
        logger.warning(f"Drive sync rétroaction : {e}")

    return {
        "tache_creee": True,
        "total_accorde": total_accorde,
        "nb_subventions": nb_subventions,
    }


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
async def create_client_from_excel(
    file: UploadFile = File(...),
    devis_audit: str = "0"
):
    """
    Parse l'Excel et crée le dossier client.
    Validations métier + génération automatique du devis de démarrage (350€).
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier Excel requis (.xlsx)")
    try:
        from engine.excel_parser import parse_excel_client
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)
        parsed = parse_excel_client(tmp_path)
        tmp_path.unlink()

        if parsed.get("erreur"):
            raise HTTPException(status_code=400, detail=parsed["erreur"])

        cd = parsed["client_data"]
        if not cd.get("nom_officiel"):
            raise HTTPException(status_code=400, detail="Nom officiel manquant dans le fichier")

        # ── Validations métier ────────────────────────────────────────────
        meta_warnings = []
        cat = (cd.get("categorie") or "").lower()
        if "diffuseur" in cat and not cd.get("licence_type1"):
            meta_warnings.append("Licence spectacle manquante pour un diffuseur — à régulariser avant tout projet")

        # ── Crée le dossier ───────────────────────────────────────────────
        client_dir = create_client_folder(cd)
        meta = json.loads((client_dir / "client.json").read_text())
        nom_client = cd.get("nom_usuel") or cd.get("nom_officiel")

        # ── Génère le devis de démarrage ──────────────────────────────────
        annee = datetime.now().year
        devis = {
            "id": f"devis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "numero": f"D{annee}-{meta['slug'][:6].upper()}-001",
            "created_at": datetime.now().isoformat(),
            "client_slug": meta["slug"],
            "client_nom": nom_client,
            "type": "devis_demarrage",
            "statut": "À envoyer",
            "prestations": [{
                "description": "Rendez-vous de démarrage — Présentation, audit initial et cadrage de la mission",
                "type": "Forfait démarrage",
                "quantite": 1,
                "tarif_unitaire": 350,
                "sous_total": 350,
            }],
            "total_ht": 350,
            "tva": "Non applicable — Art. 293B du CGI",
            "acompte_pct": 0,
            "validite_jours": 30,
            "avec_audit": devis_audit == "1",
            "notes": "Généré automatiquement à la création du dossier client",
        }
        if devis_audit == "1":
            devis["notes"] += " + audit complet (montant à définir)"

        meta.setdefault("devis", []).append(devis)

        # ── Tâche de suivi devis ──────────────────────────────────────────
        task = {
            "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_devis",
            "created_at": datetime.now().isoformat(),
            "source": "Création client",
            "titre": f"Envoyer le devis de démarrage — {nom_client}",
            "priorite": "Attention",
            "description": f"Devis de rendez-vous démarrage (350€ HT) généré pour {nom_client}. Vérifier et envoyer.",
            "client_detecte": nom_client,
            "client_slug": meta["slug"],
            "type": "devis",
            "devis_id": devis["id"],
            "done": False,
        }
        if meta_warnings:
            task["description"] += f" | ⚠️ {meta_warnings[0]}"

        tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
        tasks.append(task)
        _save_tasks(tasks)

        # ── Historisation ─────────────────────────────────────────────────
        try:
            from engine.historisation import append_event, add_timestamps
            meta = add_timestamps(meta, "creation_dossier_excel", {
                "source": file.filename,
                "devis": devis["numero"],
            })
            append_event(client_dir, "creation_dossier_excel", {
                "source": file.filename,
                "devis_cree": devis["numero"],
                "warnings": meta_warnings,
            })
        except Exception as e:
            logger.warning(f"Historisation : {e}")

        (client_dir / "client.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

        # ── Projet si données présentes ───────────────────────────────────
        projet_cree = False
        if parsed.get("projet_data") and parsed["projet_data"].get("nom_projet"):
            try:
                create_project(meta["slug"], parsed["projet_data"])
                projet_cree = True
            except Exception as e:
                logger.warning(f"Projet non créé : {e}")

        return {
            "status": "created",
            "slug": meta["slug"],
            "nb_champs": parsed["nb_champs"],
            "champs_manquants": parsed["champs_manquants"],
            "projet_cree": projet_cree,
            "devis_numero": devis["numero"],
            "warnings": meta_warnings,
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


# ── Faisabilité projet ────────────────────────────────────────────────────────

@app.get("/templates/faisabilite-projet")
def download_faisabilite_template():
    """Télécharge le template d'étude de faisabilité projet."""
    from fastapi.responses import FileResponse
    path = Path(__file__).parent.parent / "templates" / "TEMPLATE_FAISABILITE_PROJET.xlsx"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template non trouvé")
    return FileResponse(
        str(path),
        filename="TEMPLATE_FAISABILITE_PROJET_PauseKreyol.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.post("/projets/analyse-faisabilite")
async def analyse_faisabilite(
    file: UploadFile = File(...),
    client_slug: str = ""
):
    """
    Parse le template de faisabilité et lance l'analyse Claude.
    Retourne verdict + indicateurs + recommandations.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier Excel requis (.xlsx)")

    try:
        from openpyxl import load_workbook
        import anthropic as anthropic_sdk

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)

        wb = load_workbook(str(tmp_path), data_only=True)
        tmp_path.unlink()

        # ── Extrait les données clés ──────────────────────────────────
        params = {}
        if "PARAMÈTRES" in wb.sheetnames:
            ws = wb["PARAMÈTRES"]
            params = {
                "nom_projet":    ws["B4"].value,
                "structure":     ws["B5"].value,
                "dates":         ws["B13"].value,
                "lieu":          ws["B14"].value,
                "type_event":    ws["B15"].value,
                "description":   ws["B16"].value,
                "nb_seances":    ws["E15"].value,
                "jauge_max":     ws["E14"].value,
                "nb_jours":      ws["E13"].value,
            }

        # Budget global depuis la synthèse
        budget_data = {}
        if "PARAMÈTRES" in wb.sheetnames:
            ws = wb["PARAMÈTRES"]
            try:
                charges_rows = []
                recettes_rows = []
                for row in ws.iter_rows(min_row=25, max_row=40, values_only=True):
                    charges_rows.append(row)
                budget_data["charges_prudent"] = ws.cell(
                    row=26 + 8, column=2).value or 0
                budget_data["recettes_prudent"] = ws.cell(
                    row=26 + 8, column=6).value or 0
            except Exception:
                pass

        # Billetterie
        billetterie_total = 0
        if "PARAMÈTRES" in wb.sheetnames:
            try:
                ws = wb["PARAMÈTRES"]
                billetterie_total = ws["G23"].value or 0
            except Exception:
                pass

        # Financements
        fin_data = {}
        if "FINANCEMENTS" in wb.sheetnames:
            ws = wb["FINANCEMENTS"]
            try:
                # Cherche la ligne TOTAL
                for row in ws.iter_rows(values_only=True):
                    if row[0] and "TOTAL FINANCEMENTS" in str(row[0]):
                        fin_data["total_prudent"] = row[2] or 0
                        fin_data["total_optimiste"] = row[3] or 0
                        break
            except Exception:
                pass

        # ── Prépare le contexte pour Claude ──────────────────────────
        client_context = {}
        if client_slug:
            matches = list(CLIENTS_DIR.glob(f"{client_slug}*"))
            if matches:
                meta = json.loads((matches[0] / "client.json").read_text())
                client_context = {
                    "nom": meta["client_data"].get("nom_officiel"),
                    "categorie": meta["client_data"].get("categorie"),
                    "licence": meta["client_data"].get("licence_type1"),
                    "date_creation": meta["client_data"].get("date_creation"),
                }

        budget_total = float(budget_data.get("charges_prudent") or 0)
        total_subs = float(fin_data.get("total_prudent") or 0)
        total_bill = float(billetterie_total or 0)
        solde = total_subs + total_bill - budget_total

        ratio_sub = (total_subs / budget_total * 100) if budget_total > 0 else 0
        ratio_bill = (total_bill / budget_total * 100) if budget_total > 0 else 0

        # ── Appel Claude ──────────────────────────────────────────────
        ai = anthropic_sdk.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        prompt = f"""Tu es Pause Kreyol, une administratrice de production culturelle experte.
Analyse la faisabilité financière de ce projet et fournis une évaluation structurée.

PROJET :
{json.dumps(params, ensure_ascii=False, indent=2)}

CHIFFRES CLÉS :
- Budget total charges : {budget_total:,.0f} €
- Total financements (subventions + partenaires) : {total_subs:,.0f} €
- Billetterie prévisionnelle : {total_bill:,.0f} €
- Solde prévisionnel : {solde:,.0f} €
- Ratio subventions/budget : {ratio_sub:.1f}%
- Ratio billetterie/charges : {ratio_bill:.1f}%

CLIENT :
{json.dumps(client_context, ensure_ascii=False, indent=2)}

Règles réglementaires à vérifier :
- Subventions publiques < 80% du budget total (Art. R1611-1)
- Subvention Mairie de Paris < 70% du budget (AAP)
- Budget doit être équilibré (charges ≤ recettes totales)
- Licence entrepreneur du spectacle obligatoire si diffuseur

Réponds UNIQUEMENT en JSON valide :
{{
  "id": "analyse_{datetime.now().strftime('%Y%m%d_%H%M%S') if True else ''}",
  "nom_projet": "...",
  "verdict": "FAVORABLE" ou "SOUS CONDITIONS" ou "DÉFAVORABLE",
  "synthese": "2-3 phrases résumant la situation",
  "indicateurs": [
    {{"label": "...", "valeur": "...", "norme": "...", "statut": "OK" ou "WARN" ou "ERROR" ou "INFO"}}
  ],
  "conditions": ["condition 1", "condition 2"],
  "points_forts": ["point 1", "point 2"],
  "points_attention": ["point 1", "point 2"],
  "budget_total": {budget_total},
  "total_subventions": {total_subs},
  "total_billetterie": {total_bill},
  "solde": {solde}
}}"""

        try:
            response = ai.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            result = json.loads(raw)
        except Exception as e:
            # Fallback : analyse sans IA
            result = {
                "id": f"analyse_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "nom_projet": params.get("nom_projet", "?"),
                "verdict": "SOUS CONDITIONS" if solde >= 0 else "DÉFAVORABLE",
                "synthese": f"Budget de {budget_total:,.0f}€. Solde prévisionnel : {solde:,.0f}€.",
                "indicateurs": [
                    {"label": "Ratio subventions/budget", "valeur": f"{ratio_sub:.1f}%", "norme": "< 80%",
                     "statut": "OK" if ratio_sub < 80 else "ERROR"},
                    {"label": "Budget équilibré", "valeur": f"Solde {solde:,.0f}€", "norme": "≥ 0€",
                     "statut": "OK" if solde >= 0 else "ERROR"},
                    {"label": "Billetterie / charges", "valeur": f"{ratio_bill:.1f}%", "norme": "> 20%",
                     "statut": "OK" if ratio_bill >= 20 else "WARN"},
                ],
                "conditions": [],
                "points_forts": [],
                "points_attention": ["Analyse IA indisponible — vérification manuelle requise"],
                "budget_total": budget_total,
                "total_subventions": total_subs,
                "total_billetterie": total_bill,
                "solde": solde,
            }

        # Ajoute les données brutes du fichier
        result["params"] = params
        result["client_slug"] = client_slug
        result["fichier"] = file.filename

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projets/creer-depuis-faisabilite")
async def creer_projet_depuis_faisabilite(
    file: UploadFile = File(...),
    client_slug: str = "",
    decision: str = "accepte",
    analyse_id: str = ""
):
    """
    Crée le projet après décision sur la faisabilité.
    - accepte : crée le projet normalement
    - condition : crée le projet avec statut 'en_attente_conditions'
    - refuse : archive l'analyse sans créer de projet
    """
    if decision == "refuse":
        # Tâche d'archivage
        task = {
            "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_refus",
            "created_at": datetime.now().isoformat(),
            "source": "Faisabilité",
            "titre": f"Projet refusé — archiver le dossier de faisabilité",
            "priorite": "Normal",
            "description": "Le projet a été refusé suite à l'analyse de faisabilité. Archiver et informer le client.",
            "client_slug": client_slug,
            "type": "archivage",
            "done": False,
        }
        tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
        tasks.append(task)
        _save_tasks(tasks)
        return {"status": "refuse", "message": "Projet refusé — tâche d'archivage créée"}

    # Création du projet
    try:
        from openpyxl import load_workbook
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)

        wb = load_workbook(str(tmp_path), data_only=True)
        tmp_path.unlink()

        # Extrait les données projet depuis PARAMÈTRES
        project_data = {"nom_projet": "Nouveau projet"}
        if "PARAMÈTRES" in wb.sheetnames:
            ws = wb["PARAMÈTRES"]
            project_data = {
                "nom_projet":          str(ws["B4"].value or "Nouveau projet"),
                "date_debut_projet":   str(ws["B13"].value or ""),
                "lieu_projet":         str(ws["B14"].value or ""),
                "description_projet":  str(ws["B16"].value or ""),
            }

        statut_initial = "en_attente_conditions" if decision == "condition" else "en_construction"
        project_data["statut_initial"] = statut_initial
        project_data["decision_faisabilite"] = decision
        project_data["analyse_id"] = analyse_id

        projet_dir = create_project(client_slug, project_data)
        meta_path = list(CLIENTS_DIR.glob(f"{client_slug}*"))[0] / "client.json"
        meta = json.loads(meta_path.read_text())

        # Tâche selon décision
        nom_projet = project_data["nom_projet"]
        if decision == "condition":
            task = {
                "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_condition",
                "created_at": datetime.now().isoformat(),
                "source": "Faisabilité",
                "titre": f"Projet sous conditions — négociation requise : {nom_projet}",
                "priorite": "Attention",
                "description": "Le projet a été accepté sous conditions. Préciser les conditions au client et obtenir son accord avant de débloquer le projet.",
                "client_slug": client_slug,
                "type": "validation",
                "done": False,
            }
            tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
            tasks.append(task)
            _save_tasks(tasks)

        return {
            "status": "created",
            "decision": decision,
            "slug": client_slug,
            "nom_projet": nom_projet,
            "statut": statut_initial,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE DEVIS & FACTURES
# ═══════════════════════════════════════════════════════════════════════════════

DEVIS_FILE = CLIENTS_DIR / "devis.json"
FACTURES_FILE = CLIENTS_DIR / "factures.json"

TARIFS_STANDARD = [
    {"label": "Supervision / Accompagnement",    "tarif": 30,  "unite": "€/heure"},
    {"label": "Extra / Mission ponctuelle",       "tarif": 40,  "unite": "€/heure"},
    {"label": "Clé en main",                      "tarif": 50,  "unite": "€/heure"},
    {"label": "Forfait facilitation",             "tarif": 150, "unite": "€/forfait"},
    {"label": "Forfait subvention (montage)",      "tarif": 210, "unite": "€/forfait"},
    {"label": "Forfait administration & prod",     "tarif": 305, "unite": "€/mois"},
    {"label": "Abonnement mensuel standard",       "tarif": 230, "unite": "€/mois"},
    {"label": "Abonnement mensuel préférentiel",   "tarif": 200, "unite": "€/mois"},
    {"label": "Mission AR&D",                      "tarif": 365, "unite": "€/mois"},
    {"label": "Cours / Formation",                 "tarif": 48,  "unite": "€/heure"},
    {"label": "Commission subvention obtenue",     "tarif": 10,  "unite": "%"},
    {"label": "Bilan / Rapport financier",         "tarif": 350, "unite": "€/bilan"},
    {"label": "Dépôt dossier subvention",          "tarif": 315, "unite": "€/dossier"},
    {"label": "Rendez-vous démarrage",             "tarif": 350, "unite": "€/forfait"},
]


def _load_devis() -> list:
    if DEVIS_FILE.exists():
        return json.loads(DEVIS_FILE.read_text())
    # Reconstruit depuis les client.json si nécessaire
    all_devis = []
    for client_dir in CLIENTS_DIR.iterdir():
        mp = client_dir / "client.json"
        if mp.exists():
            meta = json.loads(mp.read_text())
            for d in meta.get("devis", []):
                d["client_slug"] = meta["slug"]
                all_devis.append(d)
    return all_devis


def _save_devis(devis: list):
    DEVIS_FILE.parent.mkdir(parents=True, exist_ok=True)
    DEVIS_FILE.write_text(json.dumps(devis, ensure_ascii=False, indent=2))
    # Sync Drive
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("devis.json", root_id)
            if fid:
                drive_update_json(fid, devis)
            else:
                drive_upload_json(devis, "devis.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync devis.json : {e}")


def _load_factures() -> list:
    if FACTURES_FILE.exists():
        return json.loads(FACTURES_FILE.read_text())
    return []


def _save_factures(factures: list):
    FACTURES_FILE.parent.mkdir(parents=True, exist_ok=True)
    FACTURES_FILE.write_text(json.dumps(factures, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("factures.json", root_id)
            if fid:
                drive_update_json(fid, factures)
            else:
                drive_upload_json(factures, "factures.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync factures.json : {e}")


def _next_numero_devis(client_slug: str = "") -> str:
    """Numéro de devis par client : D{YEAR}-{CLIENT_INITIALS}-{N:03d}"""
    year = datetime.now().year
    devis = _load_devis()
    # Filtre par client si fourni, sinon global
    if client_slug:
        same = [d for d in devis if str(d.get("annee", "")) == str(year) and d.get("client_slug", "") == client_slug]
        # Initiales du slug (3 chars)
        initials = "".join(c.upper() for c in client_slug if c.isalpha())[:3] or "CLI"
        n = len(same) + 1
        return f"D{year}-{initials}-{n:03d}"
    else:
        this_year = [d for d in devis if str(d.get("annee", "")) == str(year)]
        n = len(this_year) + 1
        return f"D{year}-{n:03d}"


def _next_numero_facture() -> str:
    year = datetime.now().year
    factures = _load_factures()
    this_year = [f for f in factures if str(f.get("annee", "")) == str(year)]
    n = len(this_year) + 1
    return f"FACTURE N°{year}-{n:03d}-PK"


def _create_relance_tasks(devis: dict):
    """Crée les tâches de relance automatiques pour un devis envoyé."""
    tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
    nom = devis.get("client_nom", "?")
    numero = devis.get("numero", "?")

    # Relance signature à J+7 si pas signé
    tasks.append({
        "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_relance_sig",
        "created_at": datetime.now().isoformat(),
        "source": "Devis",
        "titre": f"Relance signature devis — {nom} ({numero})",
        "priorite": "Attention",
        "description": f"Le devis {numero} envoyé à {nom} n'a pas été signé sous 7 jours. Relancer le client.",
        "client_nom": nom,
        "client_slug": devis.get("client_slug"),
        "type": "relance_devis",
        "devis_id": devis.get("id"),
        "done": False,
        "auto": True,
    })
    _save_tasks(tasks)


def _create_facture_relance_tasks(facture: dict):
    """Crée tâches de relance paiement : J-7, J-1, J, J+7 avec majoration 10%."""
    tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
    nom = facture.get("client_nom", "?")
    numero = facture.get("numero", "?")
    montant = facture.get("total_ht", 0)
    montant_maj = round(montant * 1.10, 2)
    phrase_penalite = (
        f"Rappel : conformément aux conditions générales, "
        f"tout retard de paiement entraîne une majoration de 10% du montant dû "
        f"(soit {montant_maj:.2f}€) ainsi que des pénalités de retard de 3× le taux légal en vigueur."
    )

    relances = [
        ("Relance paiement J-7", "Attention",
         f"La facture {numero} ({montant}€) arrive à échéance dans 7 jours. Vérifier si le virement est en cours."),
        ("Relance paiement J-1", "URGENT",
         f"La facture {numero} ({montant}€) expire demain. Contacter {nom} immédiatement. {phrase_penalite}"),
        ("⚠️ Facture impayée — pénalités de retard", "URGENT",
         f"La facture {numero} ({montant}€) n'est pas payée à date. {phrase_penalite} Envoyer une mise en demeure."),
        ("🚨 URGENT — Impayé J+7 — Créer facture de majoration", "URGENT",
         f"La facture {numero} est impayée depuis 7 jours. {phrase_penalite} "
         f"ACTION REQUISE : Créer une nouvelle facture de majoration 10% ({montant_maj:.2f}€) "
         f"et engager une procédure de recouvrement."),
    ]

    for label, priorite, desc in relances:
        tasks.append({
            "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_fact",
            "created_at": datetime.now().isoformat(),
            "source": "Facture",
            "titre": f"{label} — {nom} ({numero})",
            "priorite": priorite,
            "description": desc,
            "client_nom": nom,
            "client_slug": facture.get("client_slug"),
            "categorie": "finance",
            "type": "relance_facture",
            "facture_id": facture.get("id"),
            "montant_facture": montant,
            "montant_majoration": montant_maj,
            "done": False,
            "auto": True,
        })
    _save_tasks(tasks)


def _create_facture_majoration(facture: dict) -> dict:
    """Crée automatiquement une facture de majoration 10% sur impayé."""
    montant = facture.get("total_ht", 0)
    montant_maj = round(montant * 0.10, 2)
    factures = _load_factures()

    facture_maj = {
        "id": f"facture_maj_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "numero": f"{_next_numero_facture()} [MAJORATION]",
        "annee": datetime.now().year,
        "created_at": datetime.now().isoformat(),
        "client_slug": facture.get("client_slug", ""),
        "client_nom": facture.get("client_nom", ""),
        "facture_origine_id": facture.get("id"),
        "facture_origine_numero": facture.get("numero"),
        "statut": "à_faire",
        "type": "majoration",
        "prestations": [{
            "description": f"Majoration 10% pour retard de paiement — facture {facture.get('numero')}",
            "type": "Majoration retard",
            "quantite": 1,
            "tarif_unitaire": montant_maj,
            "sous_total": montant_maj,
        }],
        "total_ht": montant_maj,
        "tva": "Non applicable — Art. 293B du CGI",
        "acompte_encaisse": 0,
        "solde_a_payer": montant_maj,
        "date_emission": datetime.now().strftime("%d/%m/%Y"),
        "delai_paiement_jours": 15,
        "notes": f"Majoration de 10% pour retard de paiement de la facture {facture.get('numero')} ({montant}€ HT)",
        "historique": [{"statut": "créée_majoration", "date": datetime.now().isoformat()}],
    }
    factures.append(facture_maj)
    _save_factures(factures)
    return facture_maj


# ── Routes devis ──────────────────────────────────────────────────────────────

@app.get("/devis")
def get_all_devis():
    """Retourne tous les devis."""
    return _load_devis()


@app.get("/devis/tarifs")
def get_tarifs():
    """Retourne les tarifs standard Pause Kreyol."""
    return TARIFS_STANDARD


@app.post("/devis")
def create_devis(body: dict):
    """Crée un nouveau devis."""
    devis = _load_devis()

    prestations = body.get("prestations", [])
    total_ht = sum(
        float(p.get("quantite", 1)) * float(p.get("tarif_unitaire", 0))
        for p in prestations
    )
    acompte_pct = float(body.get("acompte_pct", 30))
    acompte_montant = round(total_ht * acompte_pct / 100, 2)

    new_devis = {
        "id": f"devis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "numero": body.get("numero") or _next_numero_devis(body.get("client_slug", "")),
        "annee": datetime.now().year,
        "created_at": datetime.now().isoformat(),
        "client_slug": body.get("client_slug", ""),
        "client_nom": body.get("client_nom", ""),
        "statut": "brouillon",   # brouillon | envoyé | signé | validé | annulé | caduc
        "prestations": prestations,
        "total_ht": round(total_ht, 2),
        "tva": "Non applicable — Art. 293B du CGI",
        "acompte_pct": acompte_pct,
        "acompte_montant": acompte_montant,
        "solde": round(total_ht - acompte_montant, 2),
        "validite_jours": int(body.get("validite_jours", 30)),
        "periode": body.get("periode", ""),
        "date_emission": datetime.now().strftime("%d/%m/%Y"),
        "notes": body.get("notes", ""),
        "facilite_paiement": body.get("facilite_paiement", "1x"),  # 1x | 2x | 3x | manuel
        "echeances": body.get("echeances", []),
        "factures_liees": [],
    }
    # Remise globale
    remise_globale_pct = float(body.get("remise_globale_pct", 0))
    remise_globale_amt = round(total_ht * remise_globale_pct / 100, 2)
    total_net = round(total_ht - remise_globale_amt, 2)

    # Échéancier
    echeances = body.get("echeances", [])
    facilite = body.get("facilite_paiement", "1x")
    if not echeances and total_net > 0:
        today_str = datetime.now().strftime("%Y-%m-%d")
        add_days = lambda n: (datetime.now() + timedelta(days=n)).strftime("%Y-%m-%d")
        add_months = lambda n: (datetime.now().replace(month=((datetime.now().month-1+n)%12)+1, year=datetime.now().year+(datetime.now().month-1+n)//12)).strftime("%Y-%m-%d")
        if facilite == "1x":
            echeances = [{"label": "Paiement intégral", "montant": total_net, "date": add_days(30), "pct": 100}]
        elif facilite == "2x":
            half = round(total_net / 2, 2)
            echeances = [
                {"label": "Acompte 50%", "montant": half, "date": today_str, "pct": 50},
                {"label": "Solde 50%", "montant": total_net - half, "date": add_days(30), "pct": 50},
            ]
        elif facilite == "3x":
            third = round(total_net / 3, 2)
            echeances = [
                {"label": "1er tiers", "montant": third, "date": today_str, "pct": 33},
                {"label": "2ème tiers", "montant": third, "date": add_days(30), "pct": 33},
                {"label": "3ème tiers", "montant": total_net - 2*third, "date": add_days(60), "pct": 34},
            ]

    new_devis.update({
        "total_ht": total_net,
        "total_brut": round(total_ht, 2),
        "remise_globale_pct": remise_globale_pct,
        "remise_globale_amt": remise_globale_amt,
        "acompte_montant": round(total_net * acompte_pct / 100, 2),
        "solde": round(total_net - round(total_net * acompte_pct / 100, 2), 2),
        "echeances": echeances,
    })

    devis.append(new_devis)
    _save_devis(devis)

    # Crée des tâches pour les échéances de paiement
    if echeances:
        tasks = _load_tasks()
        for ech in echeances:
            if ech.get("date") and ech.get("montant", 0) > 0:
                task = {
                    "id": f"task_ech_{new_devis['id']}_{echeances.index(ech)}",
                    "created_at": datetime.now().isoformat(),
                    "source": "Devis",
                    "titre": f"Échéance {ech['label']} — {body.get('client_nom','')} ({ech['montant']} €)",
                    "priorite": "Normal",
                    "description": f"Devis {new_devis['numero']} · {ech['label']} : {ech['montant']} € — {body.get('client_nom','')}",
                    "deadline": ech["date"],
                    "client_slug": body.get("client_slug"),
                    "client_detecte": body.get("client_nom"),
                    "categorie": "facturation",
                    "calendrier": "formalites",
                    "done": False,
                }
                tasks.append(task)
        _save_tasks(tasks)
        logger.info(f"Devis {new_devis['numero']} : {len(echeances)} échéances → tâches créées")

        # Sync calendrier
        try:
            cal = _load_cal()
            for ech in echeances:
                if ech.get("date"):
                    cal_event = {
                        "id": int(datetime.now().timestamp() * 1000) + echeances.index(ech),
                        "created_at": datetime.now().isoformat(),
                        "titre": f"💰 {ech['label']} — {body.get('client_nom','')}",
                        "date": ech["date"],
                        "type": "formalite",
                        "client_slug": body.get("client_slug"),
                        "client": body.get("client_nom"),
                        "couleur": "#2834B7",
                        "montant": ech["montant"],
                        "devis_id": new_devis["id"],
                        "source": "devis_echeance",
                    }
                    cal["formalites"].append(cal_event)
            _save_cal(cal)
            logger.info(f"Devis {new_devis['numero']} : {len(echeances)} events calendrier créés")
        except Exception as e:
            logger.warning(f"Devis calendrier sync : {e}")

    return new_devis


@app.patch("/devis/{devis_id}")
def update_devis(devis_id: str, body: dict):
    """Met à jour un devis — gère toutes les transitions avec archivage complet."""
    devis = _load_devis()
    d = next((x for x in devis if x["id"] == devis_id), None)
    if not d:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    old_statut = d.get("statut")
    d.update(body)

    # Recalcule les totaux si prestations modifiées
    if "prestations" in body:
        total = sum(float(p.get("quantite", 1)) * float(p.get("tarif_unitaire", 0))
                    for p in body["prestations"])
        d["total_ht"] = round(total, 2)
        acompte = round(total * float(d.get("acompte_pct", 30)) / 100, 2)
        d["acompte_montant"] = acompte
        d["solde"] = round(total - acompte, 2)

    # Calcule les échéances détaillées si facilité de paiement
    if body.get("facilite_paiement") or body.get("date_signature"):
        facilite = d.get("facilite_paiement", "1x")
        total = d.get("total_ht", 0)
        acompte = d.get("acompte_montant", 0)
        solde = d.get("solde", total - acompte)
        base = datetime.now()
        echeances = []
        if facilite == "1x":
            echeances = [{"label": "Solde unique", "montant": solde,
                          "date": (base + timedelta(days=30)).strftime("%d/%m/%Y")}]
        elif facilite == "2x":
            echeances = [
                {"label": "1ère échéance (50%)", "montant": round(solde * 0.5, 2),
                 "date": (base + timedelta(days=30)).strftime("%d/%m/%Y")},
                {"label": "2ème échéance (50%)", "montant": round(solde * 0.5, 2),
                 "date": (base + timedelta(days=60)).strftime("%d/%m/%Y")},
            ]
        elif facilite == "3x":
            part = round(solde / 3, 2)
            echeances = [
                {"label": "1ère échéance (33%)", "montant": part,
                 "date": (base + timedelta(days=30)).strftime("%d/%m/%Y")},
                {"label": "2ème échéance (33%)", "montant": part,
                 "date": (base + timedelta(days=60)).strftime("%d/%m/%Y")},
                {"label": "3ème échéance (33%)", "montant": round(solde - 2 * part, 2),
                 "date": (base + timedelta(days=90)).strftime("%d/%m/%Y")},
            ]
        if echeances and facilite != "manuel":
            d["echeances"] = echeances

    new_statut = d.get("statut")

    # ── Transition : ENVOYÉ ──────────────────────────────────────────────
    if new_statut == "envoyé" and old_statut != "envoyé":
        d["date_envoi"] = datetime.now().strftime("%d/%m/%Y")
        d["date_limite_signature"] = (datetime.now() + timedelta(days=d.get("validite_jours", 30))).strftime("%d/%m/%Y")
        d["archive_entry"] = {
            "action": "envoyé",
            "date": datetime.now().isoformat(),
        }
        d.setdefault("historique", []).append({"statut": "envoyé", "date": datetime.now().isoformat()})
        _create_relance_tasks(d)

    # ── Transition : SIGNÉ / VALIDÉ ──────────────────────────────────────
    if new_statut in ("validé", "signé") and old_statut not in ("validé", "signé"):
        d["date_signature"] = datetime.now().strftime("%d/%m/%Y")
        d.setdefault("historique", []).append({"statut": "signé", "date": datetime.now().isoformat()})
        tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
        # Tâche acompte
        tasks.append({
            "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S')}_acompte",
            "created_at": datetime.now().isoformat(),
            "source": "Devis",
            "titre": f"Valider réception acompte — {d['client_nom']} ({d['numero']})",
            "priorite": "Attention",
            "categorie": "finance",
            "description": (
                f"Le devis {d['numero']} a été signé. "
                f"Acompte attendu : {d.get('acompte_montant', 0)}€ ({d.get('acompte_pct', 30)}%). "
                f"Confirmer la réception avant de lancer les travaux."
            ),
            "client_slug": d.get("client_slug"),
            "type": "acompte",
            "devis_id": devis_id,
            "done": False,
        })
        # Tâche créer facture
        tasks.append({
            "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S')}2_facture",
            "created_at": datetime.now().isoformat(),
            "source": "Devis",
            "titre": f"Créer et envoyer la facture — {d['client_nom']} ({d['numero']})",
            "priorite": "Attention",
            "categorie": "facture",
            "description": f"Le devis {d['numero']} est signé. Générer la facture correspondante, la vérifier et l'envoyer au client.",
            "client_slug": d.get("client_slug"),
            "type": "facture",
            "devis_id": devis_id,
            "done": False,
        })
        _save_tasks(tasks)

        # Auto-création de la facture
        factures = _load_factures()
        if not d.get("factures_liees"):
            total = d.get("total_ht", 0)
            facture = {
                "id": f"facture_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "numero": _next_numero_facture(),
                "annee": datetime.now().year,
                "created_at": datetime.now().isoformat(),
                "client_slug": d.get("client_slug", ""),
                "client_nom": d.get("client_nom", ""),
                "devis_id": devis_id,
                "devis_numero": d.get("numero", ""),
                "statut": "à_faire",
                "prestations": d.get("prestations", []),
                "total_ht": round(total, 2),
                "tva": "Non applicable — Art. 293B du CGI",
                "acompte_encaisse": 0,
                "solde_a_payer": round(total, 2),
                "date_emission": datetime.now().strftime("%d/%m/%Y"),
                "delai_paiement_jours": 30,
                "date_echeance": (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y"),
                "periode": d.get("periode", ""),
                "facilite_paiement": d.get("facilite_paiement", "1x"),
                "echeances": d.get("echeances", []),
                "notes": "",
                "historique": [{"statut": "créée", "date": datetime.now().isoformat()}],
            }
            factures.append(facture)
            _save_factures(factures)
            d.setdefault("factures_liees", []).append(facture["id"])
            d["statut"] = "facturé"
            new_statut = "facturé"

    # ── Transition : ANNULÉ ───────────────────────────────────────────────
    if new_statut == "annulé" and old_statut != "annulé":
        d["date_annulation"] = datetime.now().strftime("%d/%m/%Y")
        d["annulation_marker"] = "⛔ DEVIS ANNULÉ"
        d["archive_entry"] = {
            "action": "annulé",
            "date": datetime.now().isoformat(),
            "ancien_statut": old_statut,
        }
        d.setdefault("historique", []).append({
            "statut": "annulé", "date": datetime.now().isoformat(), "ancien_statut": old_statut
        })
        d["archived"] = True

    # ── Transition : CADUC ────────────────────────────────────────────────
    if new_statut == "caduc" and old_statut != "caduc":
        d["date_caducite"] = datetime.now().strftime("%d/%m/%Y")
        d["annulation_marker"] = "⏰ DEVIS CADUC"
        d.setdefault("historique", []).append({"statut": "caduc", "date": datetime.now().isoformat()})
        d["archived"] = True

    _save_devis(devis)
    return d


# ── Routes factures ───────────────────────────────────────────────────────────

@app.delete("/devis/{devis_id}")
def delete_devis(devis_id: str):
    """Supprime définitivement un devis (ou l'archive si facture liée)."""
    devis = _load_devis()
    d = next((x for x in devis if x["id"] == devis_id), None)
    if not d:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    if d.get("factures_liees"):
        # Si facture liée, archive plutôt que suppression
        d["archived"] = True
        d["annulation_marker"] = "🗑 ARCHIVÉ"
        d.setdefault("historique", []).append({"statut": "archivé_manuellement", "date": datetime.now().isoformat()})
        _save_devis(devis)
        return {"status": "archived", "reason": "factures_liées_conservées"}
    devis = [x for x in devis if x["id"] != devis_id]
    _save_devis(devis)
    return {"status": "deleted"}


@app.delete("/factures/{facture_id}")
def delete_facture(facture_id: str):
    """Supprime une facture (si non payée) ou l'annule (si payée)."""
    factures = _load_factures()
    f = next((x for x in factures if x["id"] == facture_id), None)
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    if f.get("statut") == "payée":
        # Ne peut pas supprimer une facture payée — on l'annule
        f["statut"] = "annulée"
        f["date_annulation"] = datetime.now().strftime("%d/%m/%Y")
        f.setdefault("historique", []).append({"statut": "annulée", "date": datetime.now().isoformat()})
        _save_factures(factures)
        return {"status": "annulée", "reason": "facture_payée_ne_peut_être_supprimée"}
    factures = [x for x in factures if x["id"] != facture_id]
    _save_factures(factures)
    return {"status": "deleted"}

@app.get("/factures")
def get_all_factures():
    """Retourne toutes les factures."""
    return _load_factures()


@app.post("/factures")
def create_facture(body: dict):
    """Crée une facture (depuis un devis validé ou manuelle)."""
    factures = _load_factures()
    devis_id = body.get("devis_id")

    # Récupère le devis lié si fourni
    devis_lie = None
    if devis_id:
        devis = _load_devis()
        devis_lie = next((d for d in devis if d["id"] == devis_id), None)

    total_ht = float(body.get("total_ht", 0)) or (devis_lie["total_ht"] if devis_lie else 0)

    facture = {
        "id": f"facture_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "numero": body.get("numero") or _next_numero_facture(),
        "annee": datetime.now().year,
        "created_at": datetime.now().isoformat(),
        "client_slug": body.get("client_slug") or (devis_lie.get("client_slug") if devis_lie else ""),
        "client_nom": body.get("client_nom") or (devis_lie.get("client_nom") if devis_lie else ""),
        "devis_id": devis_id,
        "devis_numero": devis_lie.get("numero") if devis_lie else body.get("devis_numero", ""),
        "statut": "à_faire",  # à_faire | envoyée | payée | annulée | en_retard
        "prestations": body.get("prestations") or (devis_lie.get("prestations") if devis_lie else []),
        "total_ht": round(total_ht, 2),
        "tva": "Non applicable — Art. 293B du CGI",
        "acompte_encaisse": float(body.get("acompte_encaisse", 0)),
        "solde_a_payer": round(total_ht - float(body.get("acompte_encaisse", 0)), 2),
        "date_emission": datetime.now().strftime("%d/%m/%Y"),
        "delai_paiement_jours": int(body.get("delai_paiement_jours", 30)),
        "periode": body.get("periode") or (devis_lie.get("periode") if devis_lie else ""),
        "notes": body.get("notes", ""),
        "facilite_paiement": body.get("facilite_paiement", "1x"),
    }
    factures.append(facture)
    _save_factures(factures)

    # Lie la facture au devis
    if devis_lie:
        devis_list = _load_devis()
        for d in devis_list:
            if d["id"] == devis_id:
                d.setdefault("factures_liees", []).append(facture["id"])
                d["statut"] = "facturé"
                break
        _save_devis(devis_list)

    # Tâche : vérifier et envoyer la facture
    tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
    tasks.append({
        "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S')}_facture",
        "created_at": datetime.now().isoformat(),
        "source": "Facture",
        "titre": f"Vérifier et envoyer facture — {facture['client_nom']} ({facture['numero']})",
        "priorite": "Attention",
        "description": f"Facture {facture['numero']} de {facture['total_ht']}€ créée. Vérifier et envoyer au client.",
        "client_slug": facture["client_slug"],
        "type": "facture",
        "facture_id": facture["id"],
        "done": False,
    })
    _save_tasks(tasks)

    return facture


@app.patch("/factures/{facture_id}")
def update_facture(facture_id: str, body: dict):
    """Met à jour une facture — gère paiement, retard, majoration 10%."""
    factures = _load_factures()
    f = next((x for x in factures if x["id"] == facture_id), None)
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    old_statut = f.get("statut")
    f.update(body)
    new_statut = f.get("statut")
    f.setdefault("historique", []).append({"statut": new_statut, "date": datetime.now().isoformat()})

    if new_statut == "envoyée" and old_statut != "envoyée":
        f["date_envoi"] = datetime.now().strftime("%d/%m/%Y")
        f["date_echeance"] = (datetime.now() + timedelta(days=f.get("delai_paiement_jours", 30))).strftime("%d/%m/%Y")
        _create_facture_relance_tasks(f)

    if new_statut == "payée" and old_statut != "payée":
        f["date_paiement"] = datetime.now().strftime("%d/%m/%Y")
        # Clôture toutes les relances auto
        tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
        for t in tasks:
            if t.get("facture_id") == facture_id and t.get("auto"):
                t["done"] = True
        _save_tasks(tasks)

    if new_statut == "en_retard" and old_statut != "en_retard":
        f["date_retard"] = datetime.now().strftime("%d/%m/%Y")
        # Auto-crée la facture de majoration 10%
        facture_maj = _create_facture_majoration(f)
        f["facture_majoration_id"] = facture_maj["id"]
        # Tâche urgente
        tasks = json.loads(TASKS_FILE.read_text()) if TASKS_FILE.exists() else []
        tasks.append({
            "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S')}_retard",
            "created_at": datetime.now().isoformat(),
            "source": "Facture",
            "titre": f"🚨 URGENT — Impayé J+7 — {f['client_nom']} ({f['numero']})",
            "priorite": "URGENT",
            "categorie": "finance",
            "description": (
                f"La facture {f['numero']} ({f['total_ht']}€) est impayée depuis 7 jours. "
                f"Une facture de majoration 10% ({round(f['total_ht']*0.1,2)}€) a été créée automatiquement ({facture_maj['numero']}). "
                f"Relance manuelle obligatoire et procédure de recouvrement à engager."
            ),
            "client_slug": f.get("client_slug"),
            "type": "relance_facture",
            "facture_id": facture_id,
            "facture_maj_id": facture_maj["id"],
            "done": False,
        })
        _save_tasks(tasks)

    _save_factures(factures)
    return f


@app.get("/devis-factures/dashboard")
def get_devis_factures_dashboard():
    """Vue globale : métriques devis + factures."""
    devis = _load_devis()
    factures = _load_factures()

    return {
        "devis": {
            "total": len(devis),
            "valides": len([d for d in devis if d["statut"] in ("validé", "signé")]),
            "en_cours": len([d for d in devis if d["statut"] in ("envoyé", "brouillon")]),
            "annules": len([d for d in devis if d["statut"] == "annulé"]),
            "ca_devis_valides": sum(d["total_ht"] for d in devis if d["statut"] in ("validé", "signé")),
        },
        "factures": {
            "total": len(factures),
            "payees": len([f for f in factures if f["statut"] == "payée"]),
            "envoyees": len([f for f in factures if f["statut"] == "envoyée"]),
            "a_faire": len([f for f in factures if f["statut"] == "à_faire"]),
            "ca_encaisse": sum(f["total_ht"] for f in factures if f["statut"] == "payée"),
            "en_attente": sum(f["solde_a_payer"] for f in factures if f["statut"] in ("envoyée", "à_faire")),
        },
        "liste_devis": sorted(devis, key=lambda x: x["created_at"], reverse=True),
        "liste_factures": sorted(factures, key=lambda x: x["created_at"], reverse=True),
    }


# ── Calendriers ───────────────────────────────────────────────────────────────

CAL_FILE = CLIENTS_DIR / "calendrier.json"


def _load_cal() -> dict:
    if CAL_FILE.exists():
        return json.loads(CAL_FILE.read_text())
    return {"formalites": [], "culturel": []}


def _save_cal(data: dict):
    CAL_FILE.parent.mkdir(parents=True, exist_ok=True)
    CAL_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("calendrier.json", root_id)
            if fid:
                drive_update_json(fid, data)
            else:
                drive_upload_json(data, "calendrier.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync calendrier.json : {e}")


@app.get("/calendrier")
def get_calendrier():
    """Retourne tous les événements des deux calendriers."""
    cal = _load_cal()
    # Enrichit avec les alertes de conformité
    alertes_events = []
    for client in list_clients():
        matches = list(CLIENTS_DIR.glob(f"{client['slug']}*"))
        if matches:
            try:
                alerts = read_alerts(matches[0])
                for a in alerts:
                    if a.get("date_expiration") and a.get("statut") != "OK":
                        alertes_events.append({
                            "id": f"auto_{a['organisme']}_{client['slug']}",
                            "date": a["date_expiration"],
                            "titre": f"{a['organisme']} — {client['nom']}",
                            "type": "formalite",
                            "couleur": "#B71C1C" if a["statut"] == "EXPIRÉ" else "#E65100" if a["statut"] == "URGENT" else "#1565C0",
                            "auto": True,
                            "statut": a["statut"],
                            "client": client["nom"],
                        })
            except Exception:
                pass
    cal["auto_formalites"] = alertes_events
    return cal


@app.post("/calendrier/event")
def add_cal_event(body: dict):
    """Ajoute un événement au calendrier."""
    cal = _load_cal()
    cal_type = "culturel" if body.get("type") in ("culturel", "festival", "formation") else "formalites"
    event = {
        "id": int(datetime.now().timestamp() * 1000),
        "created_at": datetime.now().isoformat(),
        **body,
    }
    cal[cal_type].append(event)
    _save_cal(cal)
    return event


@app.delete("/calendrier/event/{event_id}")
def delete_cal_event(event_id: int):
    """Supprime un événement du calendrier."""
    cal = _load_cal()
    for key in ("formalites", "culturel"):
        cal[key] = [e for e in cal[key] if e.get("id") != event_id]
    _save_cal(cal)
    return {"status": "deleted"}


# ── Communication ─────────────────────────────────────────────────────────────

EMAIL_PROMPTS = {
    "onboarding": "Rédige un email professionnel de bienvenue et d'accueil pour un nouveau client qui vient de signer avec Pause Kreyol. Présente-toi, explique le processus de démarrage, demande les documents nécessaires et propose un premier rendez-vous.",
    "devis_envoi": "Rédige un email professionnel pour accompagner l'envoi d'un devis. Explique brièvement les prestations proposées, mets en valeur l'expertise de Pause Kreyol, et invite à signer dans les 30 jours.",
    "devis_relance": "Rédige un email de relance courtois mais ferme pour un devis qui n'a pas été signé depuis plus de 7 jours. Rappelle les bénéfices, propose un appel pour répondre aux questions et rappelle la date de validité.",
    "facture_envoi": "Rédige un email professionnel pour accompagner l'envoi d'une facture. Remercie pour la confiance accordée, rappelle les prestations réalisées, le montant et le délai de paiement de 30 jours.",
    "facture_relance": "Rédige un email de relance pour une facture impayée. Rappelle la facture en question, le montant dû, la date d'échéance dépassée, et mentionne discrètement les pénalités de retard (3× le taux légal) sans être agressif.",
    "subvention_update": "Rédige un email de mise à jour sur l'avancement d'un dossier de subvention. Informe le client de l'état du dossier, des prochaines étapes et des documents encore attendus.",
    "projet_demarrage": "Rédige un email pour marquer le démarrage officiel d'un projet. Récapitule les grandes étapes, le calendrier prévisionnel, les prochains jalons et exprime l'enthousiasme pour cette collaboration.",
    "bilan": "Rédige un email de bilan de mission. Récapitule les actions menées, les résultats obtenus (subventions, projets, documents), remercie pour la confiance et propose la suite de la collaboration.",
}

@app.post("/comm/generer-email")
def generer_email(body: dict):
    """Génère un email professionnel adapté au client via Claude."""
    import anthropic as anthropic_sdk

    client_nom = body.get("client_nom", "le client")
    email_type = body.get("type", "custom")
    custom = body.get("custom", "")

    base_prompt = EMAIL_PROMPTS.get(email_type, custom)
    if not base_prompt:
        raise HTTPException(status_code=400, detail="Type d'email ou description requis")

    ai = anthropic_sdk.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

    prompt = f"""Tu es Pause Kreyol, une administratrice de production culturelle indépendante experte et bienveillante.

{base_prompt}

Client concerné : {client_nom}

Règles de rédaction :
- Ton professionnel mais chaleureux, adapté au milieu culturel
- Tututoiement ou vouvoiement selon le contexte (utilise le vouvoiement par défaut)
- Signature : "Cordialement, / [Prénom] / Pause Kreyol / Administration de production culturelle"
- Longueur : concis et efficace (pas plus de 15 lignes)
- Inclure un objet d'email sur la première ligne (format : "Objet : ...")
- Texte uniquement, pas de markdown

Génère l'email complet avec l'objet."""

    try:
        response = ai.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        email_text = response.content[0].text.strip()
        return {"email": email_text, "client": client_nom, "type": email_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur génération email : {e}")


# ── Authentification ──────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(body: dict):
    """Vérifie le mot de passe. Simple et efficace."""
    password = body.get("password", "")
    expected = os.environ.get("APP_PASSWORD", "pausekreyol2026")

    if not password or password != expected:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    return {"status": "ok", "message": "Authentifié"}


# ── Import historique depuis Compta_Pro.xlsx ──────────────────────────────────

@app.post("/import/compta-historique")
async def import_compta_historique(file: UploadFile = File(...)):
    """
    Importe l'historique complet depuis Pause_Kreyol_Comptabilite_Pro.xlsx :
    1. Crée les dossiers clients manquants dans la base locale + Drive
    2. Rattache chaque devis/facture au bon slug client
    3. Sauvegarde devis.json + factures.json sur Drive
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier Excel requis (.xlsx)")

    try:
        from openpyxl import load_workbook

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)
        wb = load_workbook(str(tmp_path), data_only=True)
        tmp_path.unlink()

        # ── 1. Crée les clients manquants ─────────────────────────────────────
        clients_existants = list_clients()
        noms_existants = {c["nom"].lower().strip() for c in clients_existants}
        slug_par_nom = {c["nom"].lower().strip(): c["slug"] for c in clients_existants}
        clients_crees = {}
        stats = {"clients_crees": 0, "devis_importes": 0, "factures_importees": 0,
                 "devis_ignores": 0, "factures_ignorees": 0}

        # Collecte tous les noms clients uniques dans devis + factures
        noms_compta = set()
        for sheet in ["📝 Devis", "🧾 Factures"]:
            if sheet in wb.sheetnames:
                ws = wb[sheet]
                for row in ws.iter_rows(min_row=5, values_only=True):
                    if row[3] and not str(row[2] or "").startswith("TOTAL"):
                        noms_compta.add(str(row[3]).strip())

        # Crée les clients manquants (version légère, sans Excel Drive)
        for nom_client in sorted(noms_compta):
            nom_lower = nom_client.lower().strip()
            if nom_lower in noms_existants:
                continue
            # Cherche correspondance partielle
            match = next((s for n, s in slug_par_nom.items() if nom_lower in n or n in nom_lower), None)
            if match:
                slug_par_nom[nom_lower] = match
                continue

            # Crée le dossier client minimal
            slug_raw = "".join(c if c.isalnum() or c in " _-" else "_" for c in nom_client).strip().replace(" ", "_")
            timestamp = datetime.now().strftime("%Y%m")
            slug = f"{slug_raw}_{timestamp}"
            client_dir = CLIENTS_DIR / slug
            client_dir.mkdir(parents=True, exist_ok=True)
            (client_dir / "projets").mkdir(exist_ok=True)
            (client_dir / "documents").mkdir(exist_ok=True)

            meta = {
                "slug": slug,
                "created_at": datetime.now().isoformat(),
                "source": "import_compta_historique",
                "client_data": {
                    "nom_officiel": nom_client,
                    "nom_usuel": nom_client,
                    "type_structure": "asso_france",
                    "email_contact": "",
                    "president": "",
                },
                "projets": [],
                "devis": [],
            }

            # Upload Drive si prod
            try:
                if os.getenv("ENV") == "production":
                    from engine.drive_storage import drive_get_or_create_folder, drive_upload_json, get_root_folder_id
                    root_id = get_root_folder_id()
                    folder_id = drive_get_or_create_folder(slug, root_id)
                    meta["drive_folder_id"] = folder_id
                    drive_upload_json(meta, "client.json", folder_id)
            except Exception as e:
                logger.warning(f"Drive client {slug} : {e}")

            (client_dir / "client.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
            slug_par_nom[nom_lower] = slug
            noms_existants.add(nom_lower)
            clients_crees[nom_client] = slug
            stats["clients_crees"] += 1
            logger.info(f"Client créé depuis historique : {nom_client} → {slug}")

        # Recharge la liste clients à jour
        clients_existants = list_clients()
        slug_par_nom = {}
        for c in clients_existants:
            slug_par_nom[c["nom"].lower().strip()] = c["slug"]

        def find_slug(nom_client: str) -> str:
            nom_l = nom_client.lower().strip()
            if nom_l in slug_par_nom:
                return slug_par_nom[nom_l]
            # Correspondance partielle
            for n, s in slug_par_nom.items():
                if nom_l in n or n in nom_l:
                    return s
            return ""

        # ── 2. Import Devis ───────────────────────────────────────────────────
        devis_existants = _load_devis()
        factures_existantes = _load_factures()
        numeros_devis = {d.get("numero") for d in devis_existants}
        numeros_factures = {f.get("numero") for f in factures_existantes}
        nouveaux_devis = []
        nouvelles_factures = []

        STATUT_DEVIS_MAP = {
            "VALIDÉ": "validé", "EN COURS": "envoyé", "ANNULÉ": "annulé",
            "NON SIGNÉ": "envoyé", "SIGNÉ": "signé",
        }
        STATUT_FACT_MAP = {
            "PAYÉ": "payée", "PAYÉE": "payée", "ENVOYÉE": "envoyée",
            "À FAIRE": "à_faire", "ANNULÉ": "annulée", "ANNULÉE": "annulée",
        }

        if "📝 Devis" in wb.sheetnames:
            ws = wb["📝 Devis"]
            for row in ws.iter_rows(min_row=5, values_only=True):
                if not row[2] or str(row[2]).startswith("TOTAL"):
                    continue
                numero = str(row[2]).strip()
                is_update = numero in numeros_devis
                if is_update:
                    stats.setdefault("devis_mis_a_jour", 0)

                client_nom = str(row[3]).strip() if row[3] else ""
                client_slug = find_slug(client_nom)
                etat_raw = str(row[4]).strip().upper() if row[4] else ""
                statut = STATUT_DEVIS_MAP.get(etat_raw, "brouillon")
                description = str(row[5]).strip() if row[5] else ""
                periode = str(row[6]).strip() if row[6] else ""
                date_envoi = str(row[7]).split(" ")[0] if row[7] else ""
                montant = float(row[8]) if isinstance(row[8], (int, float)) else 0
                acompte_m = float(row[9]) if isinstance(row[9], (int, float)) else 0
                retour_signe = str(row[10]).strip() if row[10] else ""
                facture_liee = str(row[11]).strip() if row[11] else ""
                notes = str(row[14]).strip() if row[14] else ""
                annee = str(row[1]) if row[1] else "2023"

                devis = {
                    "id": f"hist_devis_{numero.replace(' ','_').replace('/','_')}",
                    "numero": numero,
                    "annee": annee,
                    "created_at": datetime.now().isoformat(),
                    "client_slug": client_slug,
                    "client_nom": client_nom,
                    "statut": statut,
                    "archived": etat_raw in ("ANNULÉ", "NON SIGNÉ"),
                    "annulation_marker": "⛔ DEVIS ANNULÉ" if etat_raw == "ANNULÉ" else None,
                    "prestations": [{"description": description, "type": "", "quantite": 1,
                                     "tarif_unitaire": montant, "sous_total": montant}],
                    "total_ht": montant,
                    "tva": "Non applicable — Art. 293B du CGI",
                    "acompte_pct": round(acompte_m / montant * 100) if montant > 0 and acompte_m > 0 else 30,
                    "acompte_montant": acompte_m,
                    "solde": round(montant - acompte_m, 2),
                    "validite_jours": 30,
                    "periode": periode,
                    "date_emission": date_envoi,
                    "date_envoi": date_envoi,
                    "date_signature": retour_signe if retour_signe not in ("", "SIGNÉ") else None,
                    "notes": notes,
                    "facilite_paiement": "1x",
                    "factures_liees": [facture_liee] if facture_liee else [],
                    "historique": [{"statut": statut, "date": datetime.now().isoformat(), "source": "import_compta"}],
                    "source_import": "Pause_Kreyol_Comptabilite_Pro.xlsx",
                }
                if is_update:
                    # MAJ : remplace l'existant en gardant son ID original
                    devis_existants = [d if d.get("numero") != numero else {**d, **devis, "id": d["id"]} for d in devis_existants]
                    stats["devis_mis_a_jour"] = stats.get("devis_mis_a_jour", 0) + 1
                else:
                    nouveaux_devis.append(devis)
                    numeros_devis.add(numero)
                    stats["devis_importes"] += 1

        # ── 3. Import Factures ────────────────────────────────────────────────
        if "🧾 Factures" in wb.sheetnames:
            ws = wb["🧾 Factures"]
            for row in ws.iter_rows(min_row=5, values_only=True):
                if not row[2] or str(row[2]).startswith("TOTAL"):
                    continue
                numero = str(row[2]).strip()
                is_update_f = numero in numeros_factures
                if is_update_f:
                    stats.setdefault("factures_mises_a_jour", 0)

                client_nom = str(row[3]).strip() if row[3] else ""
                client_slug = find_slug(client_nom)
                etat_raw = str(row[4]).strip().upper() if row[4] else ""
                statut = STATUT_FACT_MAP.get(etat_raw, "à_faire")
                description = str(row[5]).strip() if row[5] else ""
                periode = str(row[6]).strip() if row[6] else ""
                devis_lie = str(row[7]).strip() if row[7] else ""
                montant = float(row[8]) if isinstance(row[8], (int, float)) else 0
                solde_du = float(row[11]) if isinstance(row[11], (int, float)) else 0
                notes = str(row[13]).strip() if row[13] else ""
                annee = str(row[1]) if row[1] else "2023"

                def fmt(v):
                    if not v: return ""
                    if hasattr(v, 'strftime'): return v.strftime("%d/%m/%Y")
                    return str(v).split(" ")[0]

                facture = {
                    "id": f"hist_fact_{numero.replace(' ','_').replace('/','_').replace('°','').replace('–','_')}",
                    "numero": numero,
                    "annee": annee,
                    "created_at": datetime.now().isoformat(),
                    "client_slug": client_slug,
                    "client_nom": client_nom,
                    "devis_numero": devis_lie,
                    "statut": statut,
                    "prestations": [{"description": description, "type": "", "quantite": 1,
                                     "tarif_unitaire": montant, "sous_total": montant}],
                    "total_ht": montant,
                    "tva": "Non applicable — Art. 293B du CGI",
                    "acompte_encaisse": 0,
                    "solde_a_payer": solde_du,
                    "date_emission": fmt(row[9]),
                    "date_envoi": fmt(row[9]),
                    "date_paiement": fmt(row[10]) if statut == "payée" else None,
                    "periode": periode,
                    "notes": notes,
                    "historique": [{"statut": statut, "date": datetime.now().isoformat(), "source": "import_compta"}],
                    "source_import": "Pause_Kreyol_Comptabilite_Pro.xlsx",
                }
                if is_update_f:
                    factures_existantes = [f if f.get("numero") != numero else {**f, **facture, "id": f["id"]} for f in factures_existantes]
                    stats["factures_mises_a_jour"] = stats.get("factures_mises_a_jour", 0) + 1
                else:
                    nouvelles_factures.append(facture)
                    numeros_factures.add(numero)
                    stats["factures_importees"] += 1

        # ── 4. Sauvegarde + sync Drive ────────────────────────────────────────
        all_devis = devis_existants + nouveaux_devis
        all_factures = factures_existantes + nouvelles_factures
        _save_devis(all_devis)
        _save_factures(all_factures)

        # Rattache aussi les devis au client.json correspondant
        for d in nouveaux_devis:
            slug = d.get("client_slug")
            if not slug:
                continue
            matches = list(CLIENTS_DIR.glob(f"{slug}*"))
            if not matches:
                continue
            mp = matches[0] / "client.json"
            if mp.exists():
                meta = json.loads(mp.read_text())
                meta.setdefault("devis", [])
                # Évite les doublons
                if not any(x.get("numero") == d["numero"] for x in meta["devis"]):
                    meta["devis"].append({"id": d["id"], "numero": d["numero"],
                                          "total_ht": d["total_ht"], "statut": d["statut"]})
                mp.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

        return {
            "status": "ok",
            **stats,
            "clients_crees_noms": list(clients_crees.keys()),
            "total_devis": len(all_devis),
            "total_factures": len(all_factures),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import compta historique : {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/export/compta-xlsx")
def export_compta_xlsx():
    """Génère le fichier Pause_Kreyol_Comptabilite_Pro.xlsx et le sauvegarde sur Drive."""
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    import io

    devis_list = _load_devis()
    factures_list = _load_factures()
    wb = Workbook()
    wb.remove(wb.active)

    def hdr(ws, headers, row=1):
        ws.append(["PAUSE KRÉYOL"])
        ws.append([])
        ws.append([])
        ws.append([""] + headers)
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        for col in range(1, len(headers) + 2):
            c = ws.cell(4, col)
            c.font = Font(bold=True, color="FFFFFF", size=10)
            c.fill = PatternFill("solid", fgColor="FF795A")
            c.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[4].height = 26
        ws.freeze_panes = "B5"

    # ── Devis ──
    ws_d = wb.create_sheet("\U0001f4dd Devis")
    dh = ["ANNÉE","N° DEVIS","CLIENT","ÉTAT","PRESTATION","PÉRIODE",
          "DATE ENVOI","MONTANT (€)","ACOMPTE (€)","RETOUR SIGNÉ","N° FACTURE LIÉ","MONTANT FACTURÉ","NOTES"]
    hdr(ws_d, dh)
    for d in sorted(devis_list, key=lambda x: str(x.get("annee","")), reverse=True):
        prest = (d.get("prestations") or [{}])[0].get("description","")
        ws_d.append(["",
            d.get("annee",""), d.get("numero",""), d.get("client_nom",""),
            d.get("statut","").upper(), prest, d.get("periode",""), d.get("date_envoi",""),
            d.get("total_ht",0), d.get("acompte_montant",0), d.get("date_signature",""),
            (d.get("factures_liees") or [""])[0], "", d.get("notes","")
        ])

    # ── Factures ──
    ws_f = wb.create_sheet("\U0001f9fe Factures")
    fh = ["ANNÉE","N° FACTURE","CLIENT","ÉTAT","PRESTATION","PÉRIODE","DEVIS LIÉ",
          "MONTANT (€)","DATE ENVOI","DATE PAIEMENT","SOLDE DÛ (€)","NOTES"]
    hdr(ws_f, fh)
    for f in sorted(factures_list, key=lambda x: str(x.get("annee","")), reverse=True):
        prest = (f.get("prestations") or [{}])[0].get("description","")
        ws_f.append(["",
            f.get("annee",""), f.get("numero",""), f.get("client_nom",""),
            f.get("statut","").upper(), prest, f.get("periode",""), f.get("devis_numero",""),
            f.get("total_ht",0), f.get("date_envoi",""), f.get("date_paiement",""),
            f.get("solde_a_payer",0), f.get("notes","")
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    xlsx_bytes = buf.read()

    # Sync Drive
    try:
        if os.getenv("ENV") == "production":
            from engine.drive_storage import drive_find_file, drive_upload_bytes, get_root_folder_id
            root_id = get_root_folder_id()
            fname = "Pause_Kreyol_Comptabilite_Pro.xlsx"
            fid = drive_find_file(fname, root_id)
            if not fid:
                drive_upload_bytes(xlsx_bytes, fname, root_id)
                logger.info("Compta xlsx créé sur Drive")
            else:
                # Mise à jour du fichier existant
                from googleapiclient.http import MediaIoBaseUpload
                from engine.drive_storage import _get_service
                svc = _get_service()
                svc.files().update(
                    fileId=fid,
                    media_body=MediaIoBaseUpload(io.BytesIO(xlsx_bytes),
                        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                ).execute()
                logger.info("Compta xlsx mis à jour sur Drive")
    except Exception as e:
        logger.warning(f"Drive sync compta xlsx : {e}")

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Pause_Kreyol_Comptabilite_Pro.xlsx"}
    )

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE SUBVENTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/subventions")
def get_subventions():
    return _load_subventions()

@app.post("/subventions")
def post_subvention(data: dict):
    subs = _load_subventions()
    if "id" not in data:
        from datetime import datetime
        data["id"] = f"sub_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        data["created_at"] = datetime.now().isoformat()
    subs.insert(0, data)
    _save_subventions(subs)
    return data

@app.patch("/subventions/{sub_id}")
def patch_subvention(sub_id: str, data: dict):
    subs = _load_subventions()
    updated = None
    for i, s in enumerate(subs):
        if s["id"] == sub_id:
            subs[i].update(data)
            updated = subs[i]
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Subvention non trouvée")
    _save_subventions(subs)
    return updated

@app.delete("/subventions/{sub_id}")
def delete_subvention(sub_id: str):
    subs = _load_subventions()
    subs = [s for s in subs if s["id"] != sub_id]
    _save_subventions(subs)
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE ANNUAIRE
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/annuaire")
def get_annuaire():
    return _load_annuaire()

@app.post("/annuaire")
def post_annuaire(data: dict):
    annuaire = _load_annuaire()
    if "id" not in data:
        from datetime import datetime
        data["id"] = f"contact_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    annuaire.append(data)
    _save_annuaire(annuaire)
    return data

@app.patch("/annuaire/{contact_id}")
def patch_annuaire(contact_id: str, data: dict):
    annuaire = _load_annuaire()
    updated = None
    for i, s in enumerate(annuaire):
        if s["id"] == contact_id:
            annuaire[i].update(data)
            updated = annuaire[i]
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    _save_annuaire(annuaire)
    return updated

@app.delete("/annuaire/{contact_id}")
def delete_annuaire(contact_id: str):
    annuaire = _load_annuaire()
    annuaire = [s for s in annuaire if s["id"] != contact_id]
    _save_annuaire(annuaire)
    return {"status": "ok"}

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE EMAILING & STRATÉGIE (AI)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/campaigns")
def get_campaigns():
    return _load_campaigns()

@app.post("/campaigns")
def post_campaigns(data: dict):
    campaigns = _load_campaigns()
    from datetime import datetime
    if "id" not in data:
        data["id"] = f"camp_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        data["created_at"] = datetime.now().isoformat()
    # Default status and metrics
    if "statut" not in data:
        data["statut"] = "brouillon"
    campaigns.insert(0, data)
    _save_campaigns(campaigns)
    return data

@app.patch("/campaigns/{comp_id}")
def patch_campaign(comp_id: str, data: dict):
    campaigns = _load_campaigns()
    updated = None
    for i, s in enumerate(campaigns):
        if s["id"] == comp_id:
            campaigns[i].update(data)
            updated = campaigns[i]
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Campagne non trouvée")
    _save_campaigns(campaigns)
    return updated

@app.delete("/campaigns/{comp_id}")
def delete_campaign(comp_id: str):
    campaigns = _load_campaigns()
    campaigns = [s for s in campaigns if s["id"] != comp_id]
    _save_campaigns(campaigns)
    return {"status": "ok"}

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE COMMUNICATION (CHARTE & ASSETS)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/comm/config")
def get_comm_config():
    return _load_comm()

@app.post("/comm/config")
def post_comm_config(data: dict):
    _save_comm(data)
    return {"status": "ok"}

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE RESSOURCES HUMAINES
# ═══════════════════════════════════════════════════════════════════════════════

RH_FILE = CLIENTS_DIR / "rh_data.json"

def _load_rh() -> dict:
    if RH_FILE.exists():
        try: return json.loads(RH_FILE.read_text())
        except: return {}
    return {}

def _save_rh(data: dict):
    RH_FILE.parent.mkdir(parents=True, exist_ok=True)
    RH_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("rh_data.json", root_id)
            if fid: drive_update_json(fid, data)
            else: drive_upload_json(data, "rh_data.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync rh_data.json : {e}")


@app.get("/rh/structures")
def get_rh_structures():
    """Retourne toutes les données RH des structures."""
    return _load_rh()


@app.get("/rh/structures/{slug}")
def get_rh_structure(slug: str):
    """Retourne les données RH d'une structure."""
    return _load_rh().get(slug, {})


@app.put("/rh/structures/{slug}")
def put_rh_structure(slug: str, data: dict):
    """Sauvegarde les données RH d'une structure et propage vers client.json."""
    rh = _load_rh()
    rh[slug] = {**rh.get(slug, {}), **data, "updated_at": datetime.now().isoformat()}
    _save_rh(rh)

    # Compte les 16 champs requis remplis
    CHAMPS_REQUIS = [
        "licence_spectacle", "agrement_aem", "dernier_ordre_conges", "dernier_ordre_aem",
        "numero_objet", "identifiant_net_entreprise", "numero_conges_spectacle",
        "identifiant_audiens", "affiliation_diffuseur", "centre_recouvrement",
        "adhesion_pole_emploi", "thalie_sante", "afdas", "ccnsvp", "fcap_svp", "droits_auteur",
    ]
    nb_remplis = sum(1 for c in CHAMPS_REQUIS if rh[slug].get(c) and str(rh[slug][c]).strip())
    statut_employeur = (nb_remplis == 16)

    # Propage vers client.json local
    try:
        matches = list(CLIENTS_DIR.glob(f"{slug}*"))
        if matches:
            meta_path = matches[0] / "client.json"
            if meta_path.exists():
                meta = json.loads(meta_path.read_text())
                meta["rh_info"] = {k: v for k, v in rh[slug].items() if not k.startswith("_")}
                meta["statut_employeur"] = statut_employeur
                meta["rh_champs_remplis"] = nb_remplis
                meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
                # Sync Drive
                if os.getenv("ENV") == "production":
                    from engine.drive_storage import drive_find_file, drive_update_json
                    folder_id = meta.get("drive_folder_id")
                    if folder_id:
                        fid = drive_find_file("client.json", folder_id)
                        if fid:
                            drive_update_json(fid, meta)
                logger.info(f"RH structure {slug} : {nb_remplis}/16 champs — employeur={statut_employeur}")
    except Exception as e:
        logger.warning(f"RH sync client.json {slug} : {e}")

    return {"slug": slug, "statut_employeur": statut_employeur, "champs_remplis": nb_remplis, **rh[slug]}


# ── Artistes RH ───────────────────────────────────────────────────────────────

ARTISTES_FILE = CLIENTS_DIR / "rh_artistes.json"

def _load_artistes_rh() -> list:
    if ARTISTES_FILE.exists():
        try: return json.loads(ARTISTES_FILE.read_text())
        except: return []
    return []

def _save_artistes_rh(artistes: list):
    ARTISTES_FILE.parent.mkdir(parents=True, exist_ok=True)
    # On ne sauvegarde PAS les base64 des documents (trop lourds) — seulement les métadonnées
    artistes_meta = []
    for a in artistes:
        a_clean = {k: v for k, v in a.items() if k != 'docs'}
        docs_meta = {k: {mk: mv for mk, mv in v.items() if mk != 'data'} for k, v in (a.get('docs') or {}).items()}
        a_clean['docs_meta'] = docs_meta
        artistes_meta.append(a_clean)
    ARTISTES_FILE.write_text(json.dumps(artistes_meta, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("rh_artistes.json", root_id)
            if fid: drive_update_json(fid, artistes_meta)
            else: drive_upload_json(artistes_meta, "rh_artistes.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync rh_artistes.json : {e}")


@app.get("/rh/artistes")
def get_artistes_rh():
    return _load_artistes_rh()


@app.post("/rh/artistes")
def create_artiste_rh(data: dict):
    artistes = _load_artistes_rh()
    data["id"] = data.get("id") or f"art_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    data["created_at"] = datetime.now().isoformat()
    artistes.append(data)
    _save_artistes_rh(artistes)
    return data


@app.put("/rh/artistes/{artiste_id}")
def update_artiste_rh(artiste_id: str, data: dict):
    artistes = _load_artistes_rh()
    updated = None
    for i, a in enumerate(artistes):
        if a.get("id") == artiste_id:
            artistes[i] = {**a, **data, "id": artiste_id, "updated_at": datetime.now().isoformat()}
            updated = artistes[i]
            break
    if not updated:
        data["id"] = artiste_id
        data["updated_at"] = datetime.now().isoformat()
        artistes.append(data)
        updated = data
    _save_artistes_rh(artistes)
    return updated


@app.delete("/rh/artistes/{artiste_id}")
def delete_artiste_rh(artiste_id: str):
    artistes = _load_artistes_rh()
    artistes = [a for a in artistes if a.get("id") != artiste_id]
    _save_artistes_rh(artistes)
    return {"status": "deleted"}


@app.post("/rh/artistes/{artiste_id}/documents/{doc_id}")
async def upload_doc_artiste(artiste_id: str, doc_id: str, file: UploadFile = File(...)):
    """
    Upload un document PDF/image pour un artiste vers le dossier Drive de la structure.
    Stocke l'URL Drive dans les métadonnées de l'artiste.
    """
    artistes = _load_artistes_rh()
    artiste = next((a for a in artistes if a.get("id") == artiste_id), None)
    if not artiste:
        raise HTTPException(status_code=404, detail="Artiste non trouvé")

    with tempfile.NamedTemporaryFile(suffix=Path(file.filename).suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        drive_url = None
        drive_file_id = None

        if os.getenv("ENV") == "production":
            from engine.drive_storage import (
                drive_get_or_create_folder, drive_upload_bytes, get_root_folder_id
            )
            root_id = get_root_folder_id()
            # Dossier artistes dans Drive
            artistes_folder = drive_get_or_create_folder("RH_Artistes", root_id)
            artiste_folder = drive_get_or_create_folder(
                f"{artiste.get('prenom','')}_{artiste.get('nom','')}_{artiste_id[:8]}",
                artistes_folder
            )
            file_bytes = tmp_path.read_bytes()
            file_id = drive_upload_bytes(file_bytes, file.filename, artiste_folder)
            drive_url = f"https://drive.google.com/file/d/{file_id}/view"
            drive_file_id = file_id
            logger.info(f"Doc {doc_id} uploadé Drive pour artiste {artiste_id}")

        tmp_path.unlink(missing_ok=True)

        # Met à jour les métadonnées de l'artiste
        doc_meta = {
            "nom": file.filename,
            "date": datetime.now().strftime("%d/%m/%Y"),
            "drive_url": drive_url,
            "drive_file_id": drive_file_id,
            "uploaded_at": datetime.now().isoformat(),
        }
        for i, a in enumerate(artistes):
            if a.get("id") == artiste_id:
                if "docs_meta" not in artistes[i]:
                    artistes[i]["docs_meta"] = {}
                artistes[i]["docs_meta"][doc_id] = doc_meta
                break
        _save_artistes_rh(artistes)
        return {"status": "ok", "doc_id": doc_id, "drive_url": drive_url, "nom": file.filename}

    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        logger.error(f"Upload doc artiste {artiste_id}/{doc_id} : {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Drive listing fichiers client ────────────────────────────────────────────

@app.get("/clients/{slug}/drive-files")
def list_client_drive_files(slug: str):
    """Liste tous les fichiers Drive du dossier client."""
    matches = list(CLIENTS_DIR.glob(f"{slug}*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    meta_path = matches[0] / "client.json"
    meta = json.loads(meta_path.read_text())
    folder_id = meta.get("drive_folder_id")
    if not folder_id:
        return {"files": [], "folder_id": None, "message": "Dossier Drive non configuré"}
    if os.getenv("ENV") != "production":
        return {"files": [], "folder_id": folder_id, "message": "Listing Drive disponible en production"}
    try:
        from engine.drive_storage import _get_service
        svc = _get_service()
        q = f"'{folder_id}' in parents and trashed=false"
        results = svc.files().list(
            q=q,
            fields="files(id,name,mimeType,modifiedTime,size,webViewLink)",
            orderBy="modifiedTime desc",
            pageSize=50
        ).execute()
        files = results.get("files", [])
        def cat(mime):
            if "spreadsheet" in mime or "xlsx" in mime: return "xlsx"
            if "document" in mime or "docx" in mime: return "docx"
            if "pdf" in mime: return "pdf"
            if "folder" in mime: return "folder"
            if "image" in mime: return "image"
            return "other"
        return {
            "folder_id": folder_id,
            "folder_url": f"https://drive.google.com/drive/folders/{folder_id}",
            "files": [{"id": f["id"], "nom": f["name"], "type": cat(f["mimeType"]),
                       "modifie": f.get("modifiedTime","")[:10],
                       "url": f.get("webViewLink",""),
                      } for f in files]
        }
    except Exception as e:
        logger.warning(f"Drive listing {slug} : {e}")
        return {"files": [], "folder_id": folder_id, "error": str(e)}


# ── Planning résidence ────────────────────────────────────────────────────────

RESIDENCES_FILE = CLIENTS_DIR / "rh_residences.json"

def _load_residences() -> list:
    if RESIDENCES_FILE.exists():
        try: return json.loads(RESIDENCES_FILE.read_text())
        except: return []
    return []

def _save_residences(data: list):
    RESIDENCES_FILE.parent.mkdir(parents=True, exist_ok=True)
    RESIDENCES_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("rh_residences.json", root_id)
            if fid: drive_update_json(fid, data)
            else: drive_upload_json(data, "rh_residences.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync rh_residences.json : {e}")


@app.get("/rh/residences")
def get_residences():
    return _load_residences()

@app.post("/rh/residences")
def create_residence(data: dict):
    residences = _load_residences()
    data["id"] = data.get("id") or f"res_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    data["created_at"] = datetime.now().isoformat()
    residences.append(data)
    _save_residences(residences)
    return data

@app.put("/rh/residences/{res_id}")
def update_residence(res_id: str, data: dict):
    residences = _load_residences()
    for i, r in enumerate(residences):
        if r.get("id") == res_id:
            residences[i] = {**r, **data, "id": res_id, "updated_at": datetime.now().isoformat()}
            _save_residences(residences)
            return residences[i]
    raise HTTPException(status_code=404, detail="Residence non trouvee")

@app.delete("/rh/residences/{res_id}")
def delete_residence(res_id: str):
    residences = _load_residences()
    residences = [r for r in residences if r.get("id") != res_id]
    _save_residences(residences)
    return {"status": "deleted"}

@app.get("/export/planning-residence/{res_id}")
def export_planning_residence(res_id: str):
    """Exporte le planning de residence au format xlsx."""
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    import io as io_mod

    residences = _load_residences()
    res = next((r for r in residences if r.get("id") == res_id), None)
    if not res:
        raise HTTPException(status_code=404, detail="Residence non trouvee")

    wb = Workbook()
    ws = wb.active
    ws.title = "Planning Residence"

    ORANGE = "FF795A"; BLUE = "2834B7"; PEACH = "FFD2AD"
    thin = Side(style="thin", color="DDDDDD")
    def bdr(): return Border(left=thin, right=thin, top=thin, bottom=thin)
    def hdr_font(): return Font(bold=True, color="FFFFFF", size=10, name="DM Sans")
    def body_font(bold=False): return Font(bold=bold, size=10, name="DM Sans")

    titre = f"PLANNING DE RESIDENCE — {res.get('titre','')}"
    ws.merge_cells("A1:Z1")
    ws["A1"] = titre
    ws["A1"].font = Font(bold=True, size=14, color=BLUE, name="Josefin Sans")
    info = f"Structure : {res.get('structure_nom','')} | Projet : {res.get('projet_nom','')} | Du {res.get('date_debut','')} au {res.get('date_fin','')}"
    ws["A2"] = info
    ws["A2"].font = Font(size=9, name="DM Sans")
    ws.append([])

    artistes = res.get("artistes", [])
    jours = res.get("jours", [])

    # En-tetes
    headers = ["Date", "Jour de la semaine"]
    for a in artistes:
        headers.append(a.get("prenom","") + " " + a.get("nom",""))
    headers += ["Total heures", "Notes"]
    ws.append(headers)
    hdr_row = ws.max_row
    for col, h in enumerate(headers, 1):
        c = ws.cell(hdr_row, col)
        c.font = hdr_font()
        c.fill = PatternFill("solid", fgColor=ORANGE)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = bdr()
    ws.row_dimensions[hdr_row].height = 32

    # Donnees jours
    for i, jour in enumerate(jours):
        row_vals = [jour.get("date",""), jour.get("label","")]
        heures_list = []
        for a in artistes:
            aid = a.get("id","")
            h = jour.get("heures",{}).get(aid, 0) if jour.get("heures") else 0
            heures_list.append(h)
            row_vals.append(h if h else "")
        total = sum(float(h) for h in heures_list if h)
        row_vals.append(round(total,1) if total else "")
        row_vals.append(jour.get("notes",""))
        ws.append(row_vals)
        row = ws.max_row
        bg = "FFFFFF" if i % 2 == 0 else "F9F9F9"
        for col in range(1, len(row_vals)+1):
            c = ws.cell(row, col)
            c.font = body_font()
            c.fill = PatternFill("solid", fgColor=bg)
            c.border = bdr()
            c.alignment = Alignment(horizontal="center", vertical="center")

    # Totaux par artiste
    ws.append([])
    total_row_vals = ["TOTAUX", ""]
    for a in artistes:
        aid = a.get("id","")
        tot = sum(float(j.get("heures",{}).get(aid, 0) or 0) for j in jours)
        total_row_vals.append(round(tot,1) if tot else 0)
    grand_total = sum(float(v) for v in total_row_vals[2:] if isinstance(v, (int,float)))
    total_row_vals.append(round(grand_total,1))
    total_row_vals.append("")
    ws.append(total_row_vals)
    for col in range(1, len(total_row_vals)+1):
        c = ws.cell(ws.max_row, col)
        c.font = Font(bold=True, color=BLUE, size=10, name="DM Sans")
        c.fill = PatternFill("solid", fgColor=PEACH)
        c.border = bdr()
        c.alignment = Alignment(horizontal="center")

    # Largeurs colonnes
    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 16
    for col_idx in range(3, len(headers)+1):
        ws.column_dimensions[get_column_letter(col_idx)].width = 14
    ws.freeze_panes = "C5"

    buf = io_mod.BytesIO()
    wb.save(buf)
    buf.seek(0)

    fname = f"Planning_Residence_{res.get('titre','').replace(' ','_')[:30]}.xlsx"
    return StreamingResponse(
        io_mod.BytesIO(buf.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )

# ── Upload pièce justificative subvention → Drive ────────────────────────────

@app.post("/subventions/{sub_id}/pieces/{piece_id}")
async def upload_piece_subvention(sub_id: str, piece_id: str, file: UploadFile = File(...)):
    """Upload une pièce justificative pour une subvention vers Drive."""
    subs = _load_subventions()
    sub = next((s for s in subs if s.get("id") == sub_id), None)
    if not sub:
        raise HTTPException(status_code=404, detail="Subvention non trouvée")

    with tempfile.NamedTemporaryFile(suffix=Path(file.filename).suffix or ".pdf", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        drive_url = None
        drive_file_id = None

        if os.getenv("ENV") == "production":
            from engine.drive_storage import (
                drive_get_or_create_folder, drive_upload_bytes,
                drive_find_file, get_root_folder_id
            )
            root_id = get_root_folder_id()
            # Dossier Subventions dans Drive
            sub_folder = drive_get_or_create_folder("Subventions", root_id)
            # Sous-dossier par demande
            nom_dossier = f"{sub.get('modele_nom','Subvention')[:30]}_{sub_id[:8]}"
            dem_folder = drive_get_or_create_folder(nom_dossier, sub_folder)
            file_bytes = tmp_path.read_bytes()
            file_id = drive_upload_bytes(file_bytes, file.filename, dem_folder)
            drive_url = f"https://drive.google.com/file/d/{file_id}/view"
            drive_file_id = file_id

        tmp_path.unlink(missing_ok=True)

        # Met à jour les métadonnées de la pièce dans la subvention
        doc_meta = {
            "nom": file.filename,
            "date": datetime.now().strftime("%d/%m/%Y"),
            "drive_url": drive_url,
            "drive_file_id": drive_file_id,
            "uploaded_at": datetime.now().isoformat(),
        }
        for i, s in enumerate(subs):
            if s.get("id") == sub_id:
                if "pieces_fournies" not in subs[i]:
                    subs[i]["pieces_fournies"] = {}
                subs[i]["pieces_fournies"][piece_id] = doc_meta
                break
        _save_subventions(subs)
        return {"status": "ok", "piece_id": piece_id, "drive_url": drive_url, "nom": file.filename}

    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        logger.error(f"Upload pièce subvention {sub_id}/{piece_id} : {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/export/formulaire-subvention/{sub_id}")
def export_formulaire_subvention(sub_id: str):
    """Génère un formulaire xlsx récapitulatif de la demande de subvention."""
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    import io as io_mod

    subs = _load_subventions()
    sub = next((s for s in subs if s.get("id") == sub_id), None)
    if not sub:
        raise HTTPException(status_code=404, detail="Subvention non trouvée")

    # Récupère les données client si disponible
    client_data = {}
    if sub.get("client_slug"):
        matches = list(CLIENTS_DIR.glob(f"{sub['client_slug']}*"))
        if matches:
            mp = matches[0] / "client.json"
            if mp.exists():
                meta = json.loads(mp.read_text())
                client_data = meta.get("client_data", {})

    wb = Workbook()
    ws = wb.active
    ws.title = "Dossier Subvention"

    ORANGE = "FF795A"; BLUE = "2834B7"; PEACH = "FFD2AD"; LIGHT = "F7F8FF"
    thin = Side(style="thin", color="CCCCCC")
    def bdr(): return Border(left=thin, right=thin, top=thin, bottom=thin)
    def hdr(bold=True, size=11, color="FFFFFF"): return Font(bold=bold, size=size, color=color, name="DM Sans")
    def body(bold=False, size=10): return Font(bold=bold, size=size, name="DM Sans")

    # ── Entête ──
    ws.merge_cells("A1:D1")
    ws["A1"] = "DOSSIER DE DEMANDE DE SUBVENTION"
    ws["A1"].font = Font(bold=True, size=16, color=BLUE, name="Josefin Sans")
    ws["A1"].fill = PatternFill("solid", fgColor=PEACH)
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    ws.merge_cells("A2:D2")
    ws["A2"] = f"Organisme : {sub.get('modele_nom', sub.get('organisme', '—'))}   |   Généré le {datetime.now().strftime('%d/%m/%Y')}"
    ws["A2"].font = body(size=9)
    ws["A2"].fill = PatternFill("solid", fgColor=LIGHT)
    ws.append([])

    def section_header(ws, titre, color=ORANGE):
        ws.append([titre])
        r = ws.max_row
        ws.merge_cells(f"A{r}:D{r}")
        ws.cell(r, 1).font = hdr()
        ws.cell(r, 1).fill = PatternFill("solid", fgColor=color)
        ws.cell(r, 1).alignment = Alignment(vertical="center")
        ws.row_dimensions[r].height = 22

    def field_row(ws, label, value="", required=False):
        ws.append([label + (" *" if required else ""), value or "", "", ""])
        r = ws.max_row
        ws.cell(r, 1).font = body(bold=True)
        ws.cell(r, 1).fill = PatternFill("solid", fgColor=LIGHT)
        ws.cell(r, 2).font = body()
        ws.cell(r, 2).fill = PatternFill("solid", fgColor="FFFFFF")
        ws.merge_cells(f"B{r}:D{r}")
        for col in range(1, 5):
            ws.cell(r, col).border = bdr()
        ws.row_dimensions[r].height = 18

    # ── Section 1 : Structure ──
    section_header(ws, "1. INFORMATIONS DE LA STRUCTURE DEMANDEUSE")
    field_row(ws, "Nom officiel", client_data.get("nom_officiel", sub.get("client_nom", "")), True)
    field_row(ws, "Nom usuel / Sigle", client_data.get("nom_usuel", ""))
    field_row(ws, "Numéro SIRET", client_data.get("siret", ""), True)
    field_row(ws, "Numéro RNA", client_data.get("numero_rna", ""))
    field_row(ws, "Adresse du siège social", client_data.get("adresse_siege", ""), True)
    field_row(ws, "Président(e)", client_data.get("president", ""), True)
    field_row(ws, "Email de contact", client_data.get("email_contact", ""))
    field_row(ws, "Téléphone", client_data.get("telephone", ""))
    field_row(ws, "N° Licence spectacle", client_data.get("licence_type1", ""))
    ws.append([])

    # ── Section 2 : Projet ──
    section_header(ws, "2. INFORMATIONS SUR LE PROJET / L'ACTION")
    field_row(ws, "Intitulé du projet", sub.get("projet_nom", ""), True)
    field_row(ws, "Organisme sollicité", sub.get("organisme", ""), True)
    field_row(ws, "Montant sollicité (€)", str(sub.get("montant_sollicite", "")), True)
    field_row(ws, "Deadline de dépôt", sub.get("deadline", ""))
    field_row(ws, "Date de retour prévue", sub.get("date_retour_prevue", ""))
    field_row(ws, "Statut actuel", sub.get("statut", "À préparer"))
    field_row(ws, "Notes / contexte", sub.get("notes", ""))
    ws.append([])

    # ── Section 3 : Pièces justificatives ──
    section_header(ws, "3. PIÈCES JUSTIFICATIVES", BLUE)
    ws.append(["Document", "Requis", "Fourni", "Observations"])
    hdr_r = ws.max_row
    for col, h in enumerate(["Document", "Requis", "Fourni", "Observations"], 1):
        c = ws.cell(hdr_r, col)
        c.font = hdr(size=10)
        c.fill = PatternFill("solid", fgColor="444444")
        c.alignment = Alignment(horizontal="center")
        c.border = bdr()

    PIECES_STANDARDS = [
        ("RIB", True), ("Statuts de l'association", True),
        ("Récépissé préfecture", True), ("Extrait JO (JOAFE)", True),
        ("Attestation INSEE / SIRET", True), ("Compte certifié N-1", True),
        ("PV d'Assemblée Générale", True), ("Budget prévisionnel du projet", True),
        ("Budget de l'association N-1", True), ("Dossier artistique", False),
        ("CV des intervenants", False), ("Attestation sur l'honneur", True),
        ("Déclaration co-financement", True), ("RIB de la structure", True),
    ]
    pieces_fournies = sub.get("pieces_fournies", {})
    for i, (piece, required) in enumerate(PIECES_STANDARDS):
        pid = piece.lower().replace(" ", "_").replace("(","").replace(")","").replace("'","")[:20]
        fournie = pid in pieces_fournies or piece in pieces_fournies
        ws.append([piece, "Oui" if required else "Non", "✅" if fournie else "☐", ""])
        r = ws.max_row
        bg = "F0FFF4" if fournie else ("FFFFFF" if i%2==0 else LIGHT)
        for col in range(1, 5):
            ws.cell(r, col).fill = PatternFill("solid", fgColor=bg)
            ws.cell(r, col).border = bdr()
            ws.cell(r, col).font = body()
            ws.cell(r, col).alignment = Alignment(horizontal="center" if col in [2,3] else "left")
    ws.append([])

    # ── Section 4 : Historique / Observations ──
    section_header(ws, "4. SUIVI ET OBSERVATIONS")
    field_row(ws, "Date de dépôt effective", "")
    field_row(ws, "N° de dossier", "")
    field_row(ws, "Contact instructeur", "")
    field_row(ws, "Résultat / Décision", "")
    field_row(ws, "Montant accordé (€)", "")
    field_row(ws, "Date de versement", "")

    # Largeurs colonnes
    ws.column_dimensions["A"].width = 35
    ws.column_dimensions["B"].width = 25
    ws.column_dimensions["C"].width = 10
    ws.column_dimensions["D"].width = 25

    buf = io_mod.BytesIO()
    wb.save(buf)
    buf.seek(0)

    nom = f"Dossier_Subvention_{sub.get('client_nom','')[:20]}_{sub.get('modele_nom','')[:20]}.xlsx".replace(" ","_")
    return StreamingResponse(
        io_mod.BytesIO(buf.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nom}"}
    )

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE AUDIT
# ═══════════════════════════════════════════════════════════════════════════════

AUDITS_FILE = CLIENTS_DIR / "audits.json"
PLANNING_EVENTS_FILE = CLIENTS_DIR / "planning_events.json"

def _load_audits() -> list:
    if AUDITS_FILE.exists():
        try: return json.loads(AUDITS_FILE.read_text())
        except: return []
    return []

def _save_audits(data: list):
    AUDITS_FILE.parent.mkdir(parents=True, exist_ok=True)
    AUDITS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("audits.json", root_id)
            if fid: drive_update_json(fid, data)
            else: drive_upload_json(data, "audits.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync audits.json : {e}")

def _load_planning_events() -> list:
    if PLANNING_EVENTS_FILE.exists():
        try: return json.loads(PLANNING_EVENTS_FILE.read_text())
        except: return []
    return []

def _save_planning_events(data: list):
    PLANNING_EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PLANNING_EVENTS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    if os.getenv("ENV") == "production":
        try:
            from engine.drive_storage import drive_find_file, drive_update_json, drive_upload_json, get_root_folder_id
            root_id = get_root_folder_id()
            fid = drive_find_file("planning_events.json", root_id)
            if fid: drive_update_json(fid, data)
            else: drive_upload_json(data, "planning_events.json", root_id)
        except Exception as e:
            logger.warning(f"Drive sync planning_events.json : {e}")


@app.get("/audits")
def get_audits():
    return _load_audits()

@app.post("/audits")
def create_audit(data: dict):
    audits = _load_audits()
    data["id"] = data.get("id") or f"audit_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    data["created_at"] = datetime.now().isoformat()
    data["statut"] = data.get("statut", "en_attente")
    audits.insert(0, data)
    _save_audits(audits)

    # Met à jour le statut audite dans client.json
    if data.get("client_slug"):
        try:
            matches = list(CLIENTS_DIR.glob(f"{data['client_slug']}*"))
            if matches:
                meta_path = matches[0] / "client.json"
                if meta_path.exists():
                    meta = json.loads(meta_path.read_text())
                    meta["audit_statut"] = data["statut"]
                    meta["audit_id"] = data["id"]
                    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        except Exception as e:
            logger.warning(f"Audit update client.json : {e}")

    return data

@app.put("/audits/{audit_id}")
def update_audit(audit_id: str, data: dict):
    audits = _load_audits()
    for i, a in enumerate(audits):
        if a.get("id") == audit_id:
            audits[i] = {**a, **data, "id": audit_id, "updated_at": datetime.now().isoformat()}
            _save_audits(audits)
            # Sync client.json si statut change
            if "statut" in data and audits[i].get("client_slug"):
                try:
                    matches = list(CLIENTS_DIR.glob(f"{audits[i]['client_slug']}*"))
                    if matches:
                        mp = matches[0] / "client.json"
                        if mp.exists():
                            meta = json.loads(mp.read_text())
                            meta["audit_statut"] = data["statut"]
                            mp.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
                except: pass
            return audits[i]
    raise HTTPException(status_code=404, detail="Audit non trouvé")

@app.delete("/audits/{audit_id}")
def delete_audit(audit_id: str):
    audits = _load_audits()
    audits = [a for a in audits if a.get("id") != audit_id]
    _save_audits(audits)
    return {"status": "deleted"}

@app.post("/audits/{audit_id}/complete")
def complete_audit(audit_id: str, data: dict):
    """
    Finalise un audit :
    1. Marque l'audit comme 'audite'
    2. Crée une tâche 'Envoi compte rendu' à J+5
    3. Extrait le planning prévisionnel et l'injecte dans le calendrier
    """
    audits = _load_audits()
    audit = None
    for i, a in enumerate(audits):
        if a.get("id") == audit_id:
            audits[i] = {**a, **data, "statut": "audite",
                         "completed_at": datetime.now().isoformat(),
                         "compte_rendu": data.get("compte_rendu", {})}
            audit = audits[i]
            break
    if not audit:
        raise HTTPException(status_code=404, detail="Audit non trouvé")
    _save_audits(audits)

    # Met à jour client.json
    if audit.get("client_slug"):
        try:
            matches = list(CLIENTS_DIR.glob(f"{audit['client_slug']}*"))
            if matches:
                mp = matches[0] / "client.json"
                if mp.exists():
                    meta = json.loads(mp.read_text())
                    meta["audit_statut"] = "audite"
                    meta["audit_date"] = datetime.now().strftime("%d/%m/%Y")
                    mp.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        except: pass

    # Crée la tâche "Envoi compte rendu" à J+5
    deadline_cr = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    tasks = _load_tasks()
    task_cr = {
        "id": f"task_{datetime.now().strftime('%Y%m%d%H%M%S')}_audit_cr",
        "created_at": datetime.now().isoformat(),
        "source": "Audit",
        "titre": f"Envoi compte rendu d'audit — {audit.get('client_nom', '')}",
        "priorite": "HAUT",
        "description": f"Envoyer le compte rendu de réunion de démarrage à {audit.get('client_nom', '')} suite à l'audit du {datetime.now().strftime('%d/%m/%Y')}.",
        "deadline": deadline_cr,
        "client_slug": audit.get("client_slug"),
        "client_detecte": audit.get("client_nom"),
        "categorie": "audit",
        "done": False,
    }
    tasks.append(task_cr)
    _save_tasks(tasks)

    # Injecte le planning prévisionnel dans le calendrier
    planning = data.get("planning_previsionnel", [])
    if planning:
        cal = _load_cal()
        for evt in planning:
            cal_event = {
                "id": int(datetime.now().timestamp() * 1000) + planning.index(evt),
                "created_at": datetime.now().isoformat(),
                "titre": evt.get("titre", ""),
                "date": evt.get("date", ""),
                "date_fin": evt.get("date_fin", evt.get("date", "")),
                "type": evt.get("type", "culturel"),
                "client_slug": audit.get("client_slug"),
                "client_nom": audit.get("client_nom"),
                "projet_nom": evt.get("projet_nom", ""),
                "couleur": evt.get("couleur", "#2834B7"),
                "source": "audit_planning",
            }
            cal_type = "culturel" if cal_event["type"] not in ("formalites",) else "formalites"
            cal[cal_type].append(cal_event)
        _save_cal(cal)
        logger.info(f"Planning prévisionnel injecté : {len(planning)} événements")

    return {"status": "ok", "task_cr": task_cr, "planning_events": len(planning)}


@app.get("/planning-events")
def get_planning_events():
    """Retourne tous les événements de planning prévisionnel."""
    cal = _load_cal()
    all_events = cal.get("culturel", []) + cal.get("formalites", [])
    planning = [e for e in all_events if e.get("source") == "audit_planning"]
    return planning


@app.get("/export/template-audit")
def export_template_audit():
    """Génère le template de réunion de démarrage au format xlsx."""
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    import io as io_mod

    wb = Workbook()
    ws = wb.active
    ws.title = "Réunion de démarrage"

    ORANGE = "FF795A"; BLUE = "2834B7"; PEACH = "FFD2AD"; LIGHT = "F7F8FF"; WHITE = "FFFFFF"
    thin = Side(style="thin", color="E0E0E0")
    thick = Side(style="medium", color=ORANGE)
    def bdr(): return Border(left=thin, right=thin, top=thin, bottom=thin)
    def bdr_accent(): return Border(left=Side(style="medium", color=BLUE), right=thin, top=thin, bottom=thin)

    # ── Helpers ──
    def section(ws, titre, subtitle=""):
        ws.append([])
        ws.append([titre])
        r = ws.max_row
        ws.merge_cells(f"A{r}:E{r}")
        ws.cell(r,1).font = Font(bold=True, size=12, color=WHITE, name="Josefin Sans")
        ws.cell(r,1).fill = PatternFill("solid", fgColor=BLUE)
        ws.cell(r,1).alignment = Alignment(vertical="center", indent=1)
        ws.row_dimensions[r].height = 28
        if subtitle:
            ws.append(["    " + subtitle])
            rs = ws.max_row
            ws.merge_cells(f"A{rs}:E{rs}")
            ws.cell(rs,1).font = Font(italic=True, size=9, color="888888", name="DM Sans")

    def field(ws, label, hint="", value=""):
        ws.append([label, value or ""])
        r = ws.max_row
        ws.merge_cells(f"B{r}:E{r}")
        ws.cell(r,1).font = Font(bold=True, size=10, color="444444", name="DM Sans")
        ws.cell(r,1).fill = PatternFill("solid", fgColor=LIGHT)
        ws.cell(r,1).alignment = Alignment(vertical="center", indent=1)
        ws.cell(r,2).font = Font(size=10, name="DM Sans", color="222222")
        ws.cell(r,2).fill = PatternFill("solid", fgColor=WHITE)
        ws.cell(r,2).alignment = Alignment(vertical="center", wrap_text=True, indent=1)
        for col in range(1,6):
            ws.cell(r,col).border = bdr()
        ws.row_dimensions[r].height = 22
        if hint:
            ws.cell(r,1).comment = None  # openpyxl: no easy comment, use italic note
            pass

    def note(ws, txt):
        ws.append(["", txt])
        r = ws.max_row
        ws.merge_cells(f"B{r}:E{r}")
        ws.cell(r,1).fill = PatternFill("solid", fgColor=LIGHT)
        ws.cell(r,2).font = Font(italic=True, size=9, color="AAAAAA", name="DM Sans")
        ws.row_dimensions[r].height = 16

    def bigfield(ws, label, rows=3):
        ws.append([label])
        r = ws.max_row
        ws.merge_cells(f"A{r}:E{r}")
        ws.cell(r,1).font = Font(bold=True, size=10, color="444444", name="DM Sans")
        ws.cell(r,1).fill = PatternFill("solid", fgColor=LIGHT)
        ws.cell(r,1).border = bdr()
        for extra in range(rows):
            ws.append([""])
            re_ = ws.max_row
            ws.merge_cells(f"A{re_}:E{re_}")
            ws.cell(re_,1).fill = PatternFill("solid", fgColor=WHITE)
            ws.cell(re_,1).border = bdr()
            ws.row_dimensions[re_].height = 20

    # ── EN-TÊTE ──
    ws.merge_cells("A1:E1")
    ws["A1"] = "PAUSE KRÉYOL — RÉUNION DE DÉMARRAGE"
    ws["A1"].font = Font(bold=True, size=18, color=BLUE, name="Josefin Sans")
    ws["A1"].fill = PatternFill("solid", fgColor=PEACH)
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 48

    ws.merge_cells("A2:E2")
    ws["A2"] = "Ingénierie culturelle · De l'idée au lancement, valorisons votre projet !"
    ws["A2"].font = Font(italic=True, size=10, color=ORANGE, name="DM Sans")
    ws["A2"].alignment = Alignment(horizontal="center")
    ws.row_dimensions[2].height = 20

    ws.append([])

    # ── SECTION 1 : Informations générales ──
    section(ws, "1. INFORMATIONS GÉNÉRALES")
    field(ws, "Date de la réunion")
    field(ws, "Lieu / Format", "Présentiel, Visio...")
    field(ws, "Participants (structure)")
    field(ws, "Participants (PauseKreyol)")
    field(ws, "Nom de la structure / association")
    field(ws, "Nom du projet")

    # ── SECTION 2 : Présentation de la structure ──
    section(ws, "2. PRÉSENTATION DE LA STRUCTURE", "Identité, histoire, missions")
    field(ws, "Statut juridique")
    field(ws, "Année de création")
    field(ws, "Objet social / missions")
    bigfield(ws, "Description des activités actuelles", 3)
    field(ws, "Territoire d'intervention")
    field(ws, "Équipe salariée (nb + rôles)")
    field(ws, "Budget annuel approximatif (€)")
    field(ws, "Sources de financement principales")

    # ── SECTION 3 : Projet à accompagner ──
    section(ws, "3. PROJET À ACCOMPAGNER", "Description, objectifs, calendrier")
    field(ws, "Intitulé du projet")
    field(ws, "Type de projet", "Festival, résidence, tournée, création...")
    bigfield(ws, "Description détaillée du projet", 4)
    field(ws, "Public cible")
    field(ws, "Territoire / lieux envisagés")
    field(ws, "Partenaires identifiés")
    field(ws, "Budget prévisionnel estimé (€)")
    field(ws, "Sources de financement envisagées")

    # ── SECTION 4 : Planning prévisionnel ──
    section(ws, "4. PLANNING PRÉVISIONNEL", "Dates clés à injecter dans le calendrier")
    ws.append(["Étape / Événement", "Date début", "Date fin", "Type", "Notes"])
    hr = ws.max_row
    for col, h in enumerate(["Étape / Événement", "Date début", "Date fin", "Type", "Notes"], 1):
        c = ws.cell(hr, col)
        c.font = Font(bold=True, size=10, color=WHITE, name="DM Sans")
        c.fill = PatternFill("solid", fgColor=ORANGE)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = bdr()
    ws.row_dimensions[hr].height = 24
    for _ in range(8):
        ws.append(["", "", "", "", ""])
        r = ws.max_row
        bg = WHITE if r % 2 == 0 else LIGHT
        for col in range(1,6):
            ws.cell(r,col).fill = PatternFill("solid", fgColor=bg)
            ws.cell(r,col).border = bdr()
            ws.cell(r,col).font = Font(size=10, name="DM Sans")
        ws.row_dimensions[r].height = 20

    # ── SECTION 5 : Besoins identifiés ──
    section(ws, "5. BESOINS IDENTIFIÉS & PRESTATIONS ENVISAGÉES")
    ws.append(["Prestation", "Périmètre", "Priorité", "Délai", "Notes"])
    hr2 = ws.max_row
    for col, h in enumerate(["Prestation", "Périmètre", "Priorité", "Délai", "Notes"], 1):
        c = ws.cell(hr2, col)
        c.font = Font(bold=True, size=10, color=WHITE, name="DM Sans")
        c.fill = PatternFill("solid", fgColor=BLUE)
        c.alignment = Alignment(horizontal="center")
        c.border = bdr()
    ws.row_dimensions[hr2].height = 22
    PRESTATIONS = [
        "Administration culturelle", "Gestion de subventions", "Gestion RH / Paie",
        "Communication & identité", "Comptabilité / Devis-Factures", "Conseil stratégique"
    ]
    for p in PRESTATIONS:
        ws.append([p, "", "", "", ""])
        r = ws.max_row
        for col in range(1,6):
            ws.cell(r,col).border = bdr()
            ws.cell(r,col).font = Font(size=10, name="DM Sans")
            ws.cell(r,col).fill = PatternFill("solid", fgColor=WHITE if r%2==0 else LIGHT)
        ws.row_dimensions[r].height = 20

    # ── SECTION 6 : Points de vigilance & observations ──
    section(ws, "6. POINTS DE VIGILANCE & OBSERVATIONS")
    bigfield(ws, "Points d'attention identifiés (juridique, financier, social...)", 4)
    bigfield(ws, "Recommandations immédiates", 3)

    # ── SECTION 7 : Prochaines étapes & actions ──
    section(ws, "7. PROCHAINES ÉTAPES", "Actions à engager suite à cette réunion")
    ws.append(["Action", "Responsable", "Délai", "Statut", "Notes"])
    hr3 = ws.max_row
    for col, h in enumerate(["Action", "Responsable", "Délai", "Statut", "Notes"], 1):
        c = ws.cell(hr3, col)
        c.font = Font(bold=True, size=10, color=WHITE, name="DM Sans")
        c.fill = PatternFill("solid", fgColor=ORANGE)
        c.alignment = Alignment(horizontal="center")
        c.border = bdr()
    ws.row_dimensions[hr3].height = 22
    ACTIONS = [
        "Envoi compte rendu de réunion", "Envoi devis de démarrage",
        "Collecte des documents manquants", "Accès Drive partagé",
        "Ouverture espace client PauseKreyol", ""
    ]
    for ac in ACTIONS:
        ws.append([ac, "Océane / Client", "", "À faire", ""])
        r = ws.max_row
        for col in range(1,6):
            ws.cell(r,col).border = bdr()
            ws.cell(r,col).font = Font(size=10, name="DM Sans")
            ws.cell(r,col).fill = PatternFill("solid", fgColor=WHITE if r%2==0 else LIGHT)
        ws.row_dimensions[r].height = 20

    # ── Pied de page ──
    ws.append([])
    ws.append(["Pause Kréyol · contact@pausekreyol.fr · pausekreyol.fr"])
    rf = ws.max_row
    ws.merge_cells(f"A{rf}:E{rf}")
    ws.cell(rf,1).font = Font(italic=True, size=9, color=ORANGE, name="DM Sans")
    ws.cell(rf,1).alignment = Alignment(horizontal="center")

    # Largeurs
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 20
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 14
    ws.column_dimensions["E"].width = 22

    buf = io_mod.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        io_mod.BytesIO(buf.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=PauseKreyol_Template_Reunion_Demarrage.xlsx"}
    )

# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE CALENDAR — Sync bidirectionnelle (Zcal passe par Google Cal)
# ═══════════════════════════════════════════════════════════════════════════════

GCAL_ID = os.getenv("GOOGLE_CALENDAR_ID", "primary")
# ID du calendrier Google Calendar (primary = calendrier principal du compte Gmail)
# Pour un calendrier secondaire, mettre l'ID complet (ex: xxx@group.calendar.google.com)


def _gcal_service():
    """Retourne le service Google Calendar (None si pas en prod)."""
    if os.getenv("ENV") != "production":
        return None
    try:
        from engine.drive_storage import _get_calendar_service
        return _get_calendar_service()
    except Exception as e:
        logger.warning(f"Google Calendar service unavailable: {e}")
        return None


def _gcal_event_to_local(gev: dict) -> dict:
    """Convertit un event Google Calendar en format PauseKreyol."""
    start = gev.get("start", {})
    end = gev.get("end", {})
    date = start.get("date") or start.get("dateTime", "")[:10]
    date_fin = end.get("date") or end.get("dateTime", "")[:10]
    ext = gev.get("extendedProperties", {}).get("private", {})
    return {
        "id": f"gcal_{gev['id']}",
        "gcal_id": gev["id"],
        "titre": gev.get("summary", "Sans titre"),
        "date": date,
        "date_fin": date_fin,
        "description": gev.get("description", ""),
        "lieu": gev.get("location", ""),
        "type": ext.get("pk_type", "culturel"),
        "client_slug": ext.get("pk_client_slug", ""),
        "client": ext.get("pk_client_nom", ""),
        "couleur": ext.get("pk_couleur", "#2834B7"),
        "source": "google_calendar",
        "is_indispo": ext.get("pk_indispo", "false") == "true",
        "created_at": gev.get("created", ""),
        "updated_at": gev.get("updated", ""),
    }


@app.get("/google-calendar/events")
def get_gcal_events(days_past: int = 30, days_future: int = 90):
    """
    Liste les events du Google Calendar.
    Zcal écrit ses RDV ici automatiquement — on les lit pour les afficher dans PauseKreyol.
    """
    svc = _gcal_service()
    if not svc:
        # En dev : retourne les events locaux qui ont une source gcal
        cal = _load_cal()
        all_evts = cal.get("culturel", []) + cal.get("formalites", [])
        return [e for e in all_evts if e.get("source") == "google_calendar"]

    try:
        now = datetime.utcnow()
        time_min = (now - timedelta(days=days_past)).isoformat() + "Z"
        time_max = (now + timedelta(days=days_future)).isoformat() + "Z"
        result = svc.events().list(
            calendarId=GCAL_ID,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=200,
        ).execute()
        events = result.get("items", [])
        return [_gcal_event_to_local(e) for e in events]
    except Exception as e:
        logger.error(f"Google Calendar get events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/google-calendar/events")
def create_gcal_event(body: dict):
    """
    Crée un event dans Google Calendar.
    Si is_indispo=true → crée un event 'Busy' qui bloque Zcal automatiquement.
    """
    svc = _gcal_service()
    titre = body.get("titre", "Événement")
    date = body.get("date", "")
    date_fin = body.get("date_fin", date)
    is_indispo = body.get("is_indispo", False)
    all_day = body.get("all_day", True)
    heure_debut = body.get("heure_debut", "09:00")
    heure_fin = body.get("heure_fin", "18:00")

    # Si indispo → titre standardisé pour Zcal
    if is_indispo:
        titre = f"🚫 Indispo — {titre}" if not titre.startswith("🚫") else titre

    if all_day:
        start = {"date": date}
        end = {"date": date_fin if date_fin > date else date}
    else:
        start = {"dateTime": f"{date}T{heure_debut}:00", "timeZone": "Europe/Paris"}
        end = {"dateTime": f"{date_fin or date}T{heure_fin}:00", "timeZone": "Europe/Paris"}

    gcal_event = {
        "summary": titre,
        "description": body.get("description", ""),
        "location": body.get("lieu", ""),
        "start": start,
        "end": end,
        "transparency": "opaque" if is_indispo else "transparent",
        # transparent = 'Free' dans Google Cal → ne bloque PAS Zcal
        # opaque = 'Busy' → BLOQUE Zcal automatiquement
        "extendedProperties": {
            "private": {
                "pk_type": body.get("type", "culturel"),
                "pk_client_slug": body.get("client_slug", ""),
                "pk_client_nom": body.get("client_nom", ""),
                "pk_couleur": body.get("couleur", "#2834B7"),
                "pk_indispo": "true" if is_indispo else "false",
                "pk_source": body.get("source", "pausekreyol"),
            }
        },
    }

    if not svc:
        # Dev : sauvegarde localement
        cal = _load_cal()
        local_evt = {
            "id": int(datetime.now().timestamp() * 1000),
            "gcal_id": None,
            "titre": titre,
            "date": date, "date_fin": date_fin,
            "type": body.get("type", "culturel"),
            "client_slug": body.get("client_slug", ""),
            "client": body.get("client_nom", ""),
            "couleur": "#FF0000" if is_indispo else body.get("couleur", "#2834B7"),
            "is_indispo": is_indispo,
            "source": "google_calendar",
            "created_at": datetime.now().isoformat(),
        }
        cal_type = "formalites" if is_indispo else body.get("type", "culturel")
        cal[cal_type if cal_type in cal else "culturel"].append(local_evt)
        _save_cal(cal)
        return local_evt

    try:
        created = svc.events().insert(calendarId=GCAL_ID, body=gcal_event).execute()
        logger.info(f"Google Calendar event créé: {created['id']} — {'INDISPO' if is_indispo else 'normal'}")
        return _gcal_event_to_local(created)
    except Exception as e:
        logger.error(f"Google Calendar create event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/google-calendar/events/{gcal_id}")
def update_gcal_event(gcal_id: str, body: dict):
    """Met à jour un event Google Calendar (sync descendante)."""
    svc = _gcal_service()
    if not svc:
        return {"status": "dev_mode", "gcal_id": gcal_id}
    try:
        existing = svc.events().get(calendarId=GCAL_ID, eventId=gcal_id).execute()
        if "summary" in body: existing["summary"] = body["summary"]
        if "date" in body:
            if existing.get("start", {}).get("date"):
                existing["start"] = {"date": body["date"]}
                existing["end"] = {"date": body.get("date_fin", body["date"])}
            else:
                tz = existing.get("start", {}).get("timeZone", "Europe/Paris")
                existing["start"] = {"dateTime": f"{body['date']}T{body.get('heure_debut','09:00')}:00", "timeZone": tz}
                existing["end"] = {"dateTime": f"{body.get('date_fin', body['date'])}T{body.get('heure_fin','18:00')}:00", "timeZone": tz}
        if "is_indispo" in body:
            existing["transparency"] = "opaque" if body["is_indispo"] else "transparent"
        updated = svc.events().update(calendarId=GCAL_ID, eventId=gcal_id, body=existing).execute()
        return _gcal_event_to_local(updated)
    except Exception as e:
        logger.error(f"Google Calendar update: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/google-calendar/events/{gcal_id}")
def delete_gcal_event(gcal_id: str):
    """Supprime un event de Google Calendar."""
    svc = _gcal_service()
    if not svc:
        return {"status": "dev_mode"}
    try:
        svc.events().delete(calendarId=GCAL_ID, eventId=gcal_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        logger.error(f"Google Calendar delete: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/google-calendar/disponibilites")
def get_disponibilites(date_debut: str = None, date_fin: str = None):
    """
    Retourne les créneaux disponibles (non bloqués par Zcal ou indispo).
    Zcal marque les RDV comme 'Busy' → on les détecte pour calculer les dispo.
    """
    svc = _gcal_service()
    if not svc:
        return {"disponible": True, "message": "Mode dev — Google Calendar non connecté"}
    try:
        start = date_debut or datetime.now().strftime("%Y-%m-%d")
        end = date_fin or (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        result = svc.freebusy().query(body={
            "timeMin": f"{start}T00:00:00Z",
            "timeMax": f"{end}T23:59:59Z",
            "items": [{"id": GCAL_ID}],
        }).execute()
        busy_slots = result.get("calendars", {}).get(GCAL_ID, {}).get("busy", [])
        return {
            "period": {"start": start, "end": end},
            "busy_slots": busy_slots,
            "nb_creneaux_occupes": len(busy_slots),
        }
    except Exception as e:
        logger.error(f"Google Calendar disponibilités: {e}")
        return {"error": str(e)}


@app.post("/google-calendar/sync")
def sync_gcal():
    """
    Sync bidirectionnelle : récupère tous les events Google Calendar
    et met à jour le store local PauseKreyol.
    """
    svc = _gcal_service()
    if not svc:
        return {"status": "dev_mode", "message": "Google Calendar non disponible en développement"}
    try:
        now = datetime.utcnow()
        time_min = (now - timedelta(days=7)).isoformat() + "Z"
        time_max = (now + timedelta(days=180)).isoformat() + "Z"
        result = svc.events().list(
            calendarId=GCAL_ID,
            timeMin=time_min, timeMax=time_max,
            singleEvents=True, orderBy="startTime",
            maxResults=500,
        ).execute()
        gcal_events = result.get("items", [])
        local_events = [_gcal_event_to_local(e) for e in gcal_events]

        # Merge dans le store local
        cal = _load_cal()
        # Supprime les anciens events Google Calendar
        cal["culturel"] = [e for e in cal["culturel"] if e.get("source") != "google_calendar"]
        cal["formalites"] = [e for e in cal["formalites"] if e.get("source") != "google_calendar"]
        # Réinjecte
        for evt in local_events:
            if evt.get("is_indispo") or evt.get("type") == "formalites":
                cal["formalites"].append(evt)
            else:
                cal["culturel"].append(evt)
        _save_cal(cal)
        zcal_rdv = [e for e in gcal_events if "zcal" in e.get("description", "").lower() or "calendly" in e.get("description", "").lower()]
        logger.info(f"Sync Google Calendar : {len(local_events)} events — {len(zcal_rdv)} RDV Zcal")
        return {
            "status": "ok",
            "events_synced": len(local_events),
            "zcal_rdv": len(zcal_rdv),
            "indispo": len([e for e in local_events if e.get("is_indispo")]),
        }
    except Exception as e:
        logger.error(f"Google Calendar sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/google-calendar/retroplanning/{client_slug}")
def sync_retroplanning_to_gcal(client_slug: str, body: dict):
    """
    Injecte le retroplanning d'un audit dans Google Calendar du CLIENT.
    Ces events sont taggés avec le client_slug — pas de sync globale.
    """
    svc = _gcal_service()
    events = body.get("events", [])
    created = []
    for evt in events:
        local_evt = {
            "titre": evt.get("titre", ""),
            "date": evt.get("date", ""),
            "date_fin": evt.get("date_fin", evt.get("date", "")),
            "type": evt.get("type", "culturel"),
            "client_slug": client_slug,
            "client_nom": body.get("client_nom", ""),
            "source": "retroplanning",
            "couleur": "#2834B7",
            "description": f"Retroplanning — {body.get('client_nom', '')}",
        }
        if svc:
            try:
                result = create_gcal_event(local_evt)
                created.append(result)
            except: pass
        else:
            # Dev : sauvegarde local seulement
            cal = _load_cal()
            local_store = {**local_evt, "id": int(datetime.now().timestamp()*1000) + events.index(evt)}
            cal["culturel"].append(local_store)
            _save_cal(cal)
            created.append(local_store)
    return {"status": "ok", "created": len(created), "events": created}

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE GOOGLE CALENDAR / ZCAL
# ═══════════════════════════════════════════════════════════════════════════════

def _gcal_service():
    """Retourne le service Google Calendar."""
    from engine.drive_storage import _get_calendar_service
    return _get_calendar_service()


def _gcal_primary_id() -> str:
    """Retourne l'ID du calendrier principal (primary)."""
    return os.environ.get("GCAL_CALENDAR_ID", "primary")


@app.get("/gcal/events")
def get_gcal_events(days_ahead: int = 60, days_back: int = 7):
    """
    Récupère les events Google Calendar (calendrier principal).
    Utilisé pour afficher les RDVs Zcal et les indisponibilités.
    """
    if os.getenv("ENV") != "production":
        return {"events": [], "message": "Google Calendar disponible en production uniquement"}
    try:
        svc = _gcal_service()
        now = datetime.utcnow()
        time_min = (now - timedelta(days=days_back)).isoformat() + "Z"
        time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"
        result = svc.events().list(
            calendarId=_gcal_primary_id(),
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=200,
        ).execute()
        events = result.get("items", [])
        parsed = []
        for e in events:
            start = e.get("start", {})
            end = e.get("end", {})
            parsed.append({
                "id": e.get("id"),
                "titre": e.get("summary", ""),
                "description": e.get("description", ""),
                "date": start.get("date") or start.get("dateTime", "")[:10],
                "date_fin": end.get("date") or end.get("dateTime", "")[:10],
                "heure_debut": start.get("dateTime", "")[-14:-9] if "T" in start.get("dateTime","") else "",
                "heure_fin": end.get("dateTime", "")[-14:-9] if "T" in end.get("dateTime","") else "",
                "statut": e.get("status", ""),
                "location": e.get("location", ""),
                "source": "gcal",
                "is_zcal": "zcal" in e.get("description","").lower() or "zcal.co" in e.get("description","").lower(),
                "creator": e.get("creator", {}).get("email",""),
                "couleur_id": e.get("colorId",""),
            })
        return {"events": parsed, "count": len(parsed)}
    except Exception as e:
        logger.error(f"Google Calendar read: {e}")
        return {"events": [], "error": str(e)}


@app.post("/gcal/indisponibilite")
def create_indisponibilite(body: dict):
    """
    Crée une indisponibilité dans Google Calendar.
    Zcal lira automatiquement cet event et bloquera le créneau.
    """
    titre = body.get("titre", "Indisponible — Pause Kréyol")
    date_debut = body.get("date_debut")  # YYYY-MM-DD
    date_fin = body.get("date_fin", date_debut)
    heure_debut = body.get("heure_debut")  # HH:MM ou None (all-day)
    heure_fin = body.get("heure_fin")
    notes = body.get("notes", "")
    couleur = body.get("couleur_id", "11")  # 11 = rouge Tomato dans GCal

    if not date_debut:
        raise HTTPException(status_code=400, detail="date_debut requis")

    # Sauvegarde locale d'abord
    cal = _load_cal()
    if "indisponibilites" not in cal:
        cal["indisponibilites"] = []
    local_id = f"indispo_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    local_event = {
        "id": local_id,
        "titre": titre,
        "date": date_debut,
        "date_fin": date_fin,
        "heure_debut": heure_debut,
        "heure_fin": heure_fin,
        "notes": notes,
        "type": "indisponibilite",
        "gcal_id": None,
        "created_at": datetime.now().isoformat(),
    }
    cal["indisponibilites"].append(local_event)
    _save_cal(cal)

    # Push vers Google Calendar
    if os.getenv("ENV") == "production":
        try:
            svc = _gcal_service()
            if heure_debut and heure_fin:
                event_body = {
                    "summary": titre,
                    "description": notes or "Créé depuis PauseKreyol",
                    "start": {"dateTime": f"{date_debut}T{heure_debut}:00", "timeZone": "Europe/Paris"},
                    "end":   {"dateTime": f"{date_fin}T{heure_fin}:00",   "timeZone": "Europe/Paris"},
                    "colorId": str(couleur),
                    "visibility": "private",
                }
            else:
                # Événement sur toute la journée
                fin_exclu = (datetime.strptime(date_fin, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
                event_body = {
                    "summary": titre,
                    "description": notes or "Créé depuis PauseKreyol",
                    "start": {"date": date_debut},
                    "end":   {"date": fin_exclu},
                    "colorId": str(couleur),
                    "visibility": "private",
                }
            created = svc.events().insert(
                calendarId=_gcal_primary_id(),
                body=event_body
            ).execute()
            # Met à jour l'ID Google Calendar
            for i, ev in enumerate(cal["indisponibilites"]):
                if ev["id"] == local_id:
                    cal["indisponibilites"][i]["gcal_id"] = created["id"]
                    break
            _save_cal(cal)
            local_event["gcal_id"] = created["id"]
            logger.info(f"Indispo créée dans Google Cal: {created['id']}")
        except Exception as e:
            logger.warning(f"Google Calendar push indispo: {e}")

    return local_event


@app.delete("/gcal/indisponibilite/{indispo_id}")
def delete_indisponibilite(indispo_id: str):
    """Supprime une indisponibilité (locale + Google Calendar)."""
    cal = _load_cal()
    indispos = cal.get("indisponibilites", [])
    target = next((x for x in indispos if x.get("id") == indispo_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")

    # Supprime dans Google Cal
    if target.get("gcal_id") and os.getenv("ENV") == "production":
        try:
            svc = _gcal_service()
            svc.events().delete(calendarId=_gcal_primary_id(), eventId=target["gcal_id"]).execute()
            logger.info(f"Indispo supprimée de Google Cal: {target['gcal_id']}")
        except Exception as e:
            logger.warning(f"Google Calendar delete indispo: {e}")

    cal["indisponibilites"] = [x for x in indispos if x.get("id") != indispo_id]
    _save_cal(cal)
    return {"status": "deleted"}


@app.get("/gcal/sync")
def sync_gcal():
    """
    Sync montante : lit Google Calendar et met à jour le calendrier PauseKreyol.
    Inclut les RDVs Zcal (reconnus via leur description/source).
    """
    if os.getenv("ENV") != "production":
        return {"synced": 0, "message": "Sync disponible en production uniquement"}
    try:
        svc = _gcal_service()
        now = datetime.utcnow()
        result = svc.events().list(
            calendarId=_gcal_primary_id(),
            timeMin=now.isoformat() + "Z",
            timeMax=(now + timedelta(days=90)).isoformat() + "Z",
            singleEvents=True,
            orderBy="startTime",
            maxResults=100,
        ).execute()
        events = result.get("items", [])
        cal = _load_cal()
        if "gcal_synced" not in cal:
            cal["gcal_synced"] = []

        # Met à jour les events synchés
        gcal_ids = {e.get("gcal_id") for e in cal.get("gcal_synced", [])}
        new_events = []
        for e in events:
            eid = e.get("id")
            if eid in gcal_ids:
                continue  # déjà synché
            start = e.get("start", {})
            is_zcal = any(x in e.get("description","").lower() for x in ["zcal", "zcal.co", "booking"])
            synced_evt = {
                "id": f"gcal_{eid}",
                "gcal_id": eid,
                "titre": e.get("summary",""),
                "date": start.get("date") or start.get("dateTime","")[:10],
                "type": "zcal_rdv" if is_zcal else "gcal",
                "source": "gcal",
                "is_zcal": is_zcal,
                "synced_at": datetime.now().isoformat(),
            }
            new_events.append(synced_evt)

        cal["gcal_synced"] = cal.get("gcal_synced", []) + new_events
        _save_cal(cal)
        logger.info(f"GCal sync: {len(new_events)} nouveaux events")
        return {"synced": len(new_events), "total_events": len(events)}
    except Exception as e:
        logger.error(f"GCal sync: {e}")
        return {"synced": 0, "error": str(e)}


@app.get("/gcal/indisponibilites")
def get_indisponibilites():
    """Retourne toutes les indisponibilités locales."""
    cal = _load_cal()
    return cal.get("indisponibilites", [])


@app.post("/gcal/event-to-gcal")
def push_event_to_gcal(body: dict):
    """
    Pousse un event PauseKreyol vers Google Calendar.
    Utilisé pour le retroplanning audit et les événements culturels importants.
    """
    if os.getenv("ENV") != "production":
        return {"status": "skip", "message": "Production uniquement"}
    try:
        svc = _gcal_service()
        date_debut = body.get("date")
        date_fin = body.get("date_fin", date_debut)
        couleur_map = {"culturel": "7", "formalite": "11", "reunion": "2", "planning": "9"}
        couleur_id = couleur_map.get(body.get("type",""), "1")
        
        fin_exclu = (datetime.strptime(date_fin, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
        event_body = {
            "summary": body.get("titre",""),
            "description": f"PauseKreyol · {body.get('client_nom','')} · {body.get('notes','')}",
            "start": {"date": date_debut},
            "end":   {"date": fin_exclu},
            "colorId": couleur_id,
        }
        created = svc.events().insert(calendarId=_gcal_primary_id(), body=event_body).execute()
        return {"status": "ok", "gcal_id": created["id"]}
    except Exception as e:
        logger.warning(f"Push event to GCal: {e}")
        return {"status": "error", "error": str(e)}

