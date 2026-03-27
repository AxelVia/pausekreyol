"""
PauseKreyol — Backend FastAPI
Lance avec : uvicorn api.main:app --reload
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s"
)

from fastapi import FastAPI, HTTPException
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
    import shutil
    shutil.rmtree(client_dir, ignore_errors=True)

    return {"status": "supprimé", "slug": slug, "archivé": True}
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

@app.get("/dashboard")
def get_dashboard():
    """
    Vue globale pour le dashboard principal :
    - liste des clients actifs
    - toutes les alertes toutes associations confondues
    """
    clients = list_clients()
    all_alerts = []

    for client in clients:
        slug = client["slug"]
        matches = list(CLIENTS_DIR.glob(f"{slug}*"))
        if matches:
            try:
                alerts = read_alerts(matches[0])
                for a in alerts:
                    a["client"] = client["nom"]
                    a["slug"] = slug
                all_alerts.extend(alerts)
            except Exception:
                pass

    # Trier par urgence : EXPIRÉ > URGENT > Attention > OK
    priority = {"EXPIRÉ": 0, "URGENT": 1, "Attention": 2, "OK": 3, "—": 4}
    all_alerts.sort(key=lambda x: priority.get(x.get("statut", "—"), 4))

    return {
        "nb_clients": len(clients),
        "nb_alertes_urgentes": sum(1 for a in all_alerts if a.get("statut") in ("EXPIRÉ", "URGENT")),
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
