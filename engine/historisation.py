"""
PauseKreyol — Historisation et archivage
Trace toutes les opérations sur les dossiers clients et gère les archives Drive.
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

IS_PROD = os.getenv("ENV") == "production"

# Nom du dossier archives dans Drive
ARCHIVES_FOLDER_NAME = "_ARCHIVES"


# ── Helpers ───────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now().isoformat()

def now_label() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


# ── Journal d'événements local ────────────────────────────────────────────────

def _get_journal_path(client_dir: Path) -> Path:
    return client_dir / "journal.json"


def load_journal(client_dir: Path) -> list:
    """Charge le journal d'événements d'un client."""
    path = _get_journal_path(client_dir)
    if path.exists():
        return json.loads(path.read_text())
    return []


def append_event(client_dir: Path, event_type: str, details: dict = None, user: str = "système"):
    """
    Ajoute un événement au journal du client.
    
    Types d'événements :
        - creation_dossier
        - creation_projet  
        - modification_infos
        - upload_excel
        - suppression
        - archivage
        - tache_creee
        - tache_validee
    """
    journal = load_journal(client_dir)
    event = {
        "id": f"evt_{now_label()}",
        "timestamp": now_iso(),
        "type": event_type,
        "user": user,
        "details": details or {},
    }
    journal.append(event)
    _get_journal_path(client_dir).write_text(
        json.dumps(journal, ensure_ascii=False, indent=2)
    )
    logger.info(f"[Journal] {event_type} — {client_dir.name}")
    return event


# ── Archivage Drive ───────────────────────────────────────────────────────────

def _get_or_create_archives_folder() -> Optional[str]:
    """Récupère ou crée le dossier _ARCHIVES dans Drive."""
    if not IS_PROD:
        return None
    try:
        from engine.drive_storage import drive_get_or_create_folder, get_root_folder_id
        root_id = get_root_folder_id()
        return drive_get_or_create_folder(ARCHIVES_FOLDER_NAME, root_id)
    except Exception as e:
        logger.error(f"Erreur création dossier archives : {e}")
        return None


def archive_excel_version(file_id: str, filename: str, client_slug: str, reason: str = "modification"):
    """
    Archive une version d'un fichier Excel dans _ARCHIVES/client_slug/YYYYMMDD_HHMMSS_filename.
    Appelé avant chaque modification d'un Excel existant.
    """
    if not IS_PROD or not file_id:
        return None
    try:
        from engine.drive_storage import _get_service, drive_get_or_create_folder
        service = _get_service()

        # Récupère les bytes du fichier actuel
        content = service.files().get_media(fileId=file_id).execute()

        # Trouve/crée _ARCHIVES/client_slug
        archives_id = _get_or_create_archives_folder()
        if not archives_id:
            return None
        client_archive_id = drive_get_or_create_folder(client_slug, archives_id)

        # Upload avec timestamp dans le nom
        from googleapiclient.http import MediaIoBaseUpload
        import io
        timestamp = now_label()
        archive_name = f"{timestamp}_{reason}_{filename}"
        mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        meta = {"name": archive_name, "parents": [client_archive_id]}
        media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime)
        f = service.files().create(body=meta, media_body=media, fields="id").execute()
        logger.info(f"[Archive] {archive_name} → Drive")
        return f["id"]
    except Exception as e:
        logger.error(f"Erreur archivage {filename} : {e}")
        return None


def archive_client_before_delete(client_slug: str, meta: dict):
    """
    Archive le dossier complet d'un client avant suppression.
    Déplace tout dans _ARCHIVES/SUPPRIME_YYYYMMDD_client_slug.
    """
    if not IS_PROD:
        return
    try:
        from engine.drive_storage import _get_service, drive_get_or_create_folder, get_root_folder_id
        service = _get_service()

        archives_id = _get_or_create_archives_folder()
        if not archives_id:
            return

        # Crée le dossier d'archive
        archive_name = f"SUPPRIME_{now_label()}_{client_slug}"
        archive_folder_id = drive_get_or_create_folder(archive_name, archives_id)

        # Déplace le dossier client dans les archives
        client_folder_id = meta.get("drive_folder_id")
        if client_folder_id:
            # Récupère les parents actuels du dossier
            file = service.files().get(fileId=client_folder_id, fields="parents").execute()
            current_parents = ",".join(file.get("parents", []))
            # Déplace vers archives
            service.files().update(
                fileId=client_folder_id,
                addParents=archive_folder_id,
                removeParents=current_parents,
                fields="id,parents"
            ).execute()
            logger.info(f"[Archive] Dossier client {client_slug} archivé avant suppression")

        # Upload le journal final
        from engine.drive_storage import drive_upload_json
        final_record = {
            "archived_at": now_iso(),
            "reason": "suppression",
            "client_slug": client_slug,
            "meta": meta,
        }
        drive_upload_json(final_record, "archive_record.json", archive_folder_id)

    except Exception as e:
        logger.error(f"Erreur archivage client {client_slug} : {e}")


# ── Datation dans le meta ─────────────────────────────────────────────────────

def add_timestamps(meta: dict, event: str, details: dict = None) -> dict:
    """
    Ajoute/met à jour les timestamps dans le meta d'un client.
    Conserve un historique compact des 50 dernières opérations.
    """
    if "timestamps" not in meta:
        meta["timestamps"] = {
            "created_at": meta.get("created_at", now_iso()),
            "updated_at": now_iso(),
            "history": []
        }

    meta["timestamps"]["updated_at"] = now_iso()
    meta["timestamps"]["history"].append({
        "at": now_iso(),
        "event": event,
        "details": details or {}
    })

    # Garde seulement les 50 dernières entrées
    meta["timestamps"]["history"] = meta["timestamps"]["history"][-50:]

    return meta
