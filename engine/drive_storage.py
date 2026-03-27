"""
PauseKreyol — Intégration Google Drive
Utilise le token OAuth Gmail (refresh token) pour uploader dans le Drive personnel.
Pas de compte de service — les fichiers appartiennent au vrai compte Google.
"""

import os
import io
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

IS_PROD = os.getenv("ENV") == "production"


def _get_service():
    """Retourne le client Drive via OAuth (refresh token Gmail)."""
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    creds = Credentials(
        token=None,
        refresh_token=os.environ["GMAIL_REFRESH_TOKEN"],
        client_id=os.environ["GMAIL_CLIENT_ID"],
        client_secret=os.environ["GMAIL_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=[
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
        ],
    )
    creds.refresh(Request())
    return build("drive", "v3", credentials=creds)


def get_root_folder_id() -> str:
    fid = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    if not fid:
        raise RuntimeError("GOOGLE_DRIVE_FOLDER_ID non défini")
    return fid


# ── Opérations Drive ──────────────────────────────────────────────────────────

def drive_get_or_create_folder(name: str, parent_id: str) -> str:
    service = _get_service()
    q = f"name='{name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=q, fields="files(id)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]
    meta = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


def drive_upload_file(local_path: Path, name: str, parent_id: str) -> str:
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    meta = {"name": name, "parents": [parent_id]}
    media = MediaIoBaseUpload(io.FileIO(str(local_path), "rb"), mimetype=mime)
    f = service.files().create(body=meta, media_body=media, fields="id").execute()
    return f["id"]


def drive_update_file(file_id: str, local_path: Path):
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    media = MediaIoBaseUpload(io.FileIO(str(local_path), "rb"), mimetype=mime)
    service.files().update(fileId=file_id, media_body=media).execute()


def drive_upload_json(data: dict, name: str, parent_id: str) -> str:
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    meta = {"name": name, "parents": [parent_id]}
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype="application/json")
    f = service.files().create(body=meta, media_body=media, fields="id").execute()
    return f["id"]


def drive_update_json(file_id: str, data: dict):
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype="application/json")
    service.files().update(fileId=file_id, media_body=media).execute()


def drive_read_json(file_id: str) -> dict:
    service = _get_service()
    content = service.files().get_media(fileId=file_id).execute()
    return json.loads(content)


def drive_find_file(name: str, parent_id: str) -> Optional[str]:
    service = _get_service()
    q = f"name='{name}' and '{parent_id}' in parents and trashed=false"
    results = service.files().list(q=q, fields="files(id)").execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def drive_list_folders(parent_id: str) -> list:
    service = _get_service()
    q = f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=q, fields="files(id,name)").execute()
    return results.get("files", [])


# ── Opérations haut niveau ────────────────────────────────────────────────────

def sync_client_to_drive(client_dir: Path, meta: dict) -> dict:
    if not IS_PROD:
        logger.info("Mode dev — sync Drive ignorée")
        return meta

    root_id = get_root_folder_id()
    slug = meta["slug"]

    client_folder_id = drive_get_or_create_folder(slug, root_id)
    meta["drive_folder_id"] = client_folder_id
    logger.info(f"Dossier Drive client : {client_folder_id}")

    # Debug — liste les fichiers dans client_dir
    logger.info(f"client_dir = {client_dir}")
    logger.info(f"client_dir existe = {client_dir.exists()}")
    xlsx_files = list(client_dir.glob("*.xlsx"))
    logger.info(f"Excel trouvés dans client_dir : {xlsx_files}")

    # Upload tous les Excel du dossier client
    for xlsx in client_dir.glob("*.xlsx"):
        existing_id = drive_find_file(xlsx.name, client_folder_id)
        if existing_id:
            drive_update_file(existing_id, xlsx)
            meta["drive_asso_id"] = existing_id
        else:
            fid = drive_upload_file(xlsx, xlsx.name, client_folder_id)
            meta["drive_asso_id"] = fid
        logger.info(f"Excel uploadé : {xlsx.name}")

    # Dossier projets
    projets_folder_id = drive_get_or_create_folder("projets", client_folder_id)
    meta["drive_projets_folder_id"] = projets_folder_id

    projets_local = client_dir / "projets"
    if projets_local.exists():
        for xlsx in projets_local.glob("*.xlsx"):
            existing_id = drive_find_file(xlsx.name, projets_folder_id)
            if existing_id:
                drive_update_file(existing_id, xlsx)
            else:
                drive_upload_file(xlsx, xlsx.name, projets_folder_id)
            logger.info(f"Budget uploadé : {xlsx.name}")

    # Upload client.json
    meta_file_id = drive_find_file("client.json", client_folder_id)
    if meta_file_id:
        drive_update_json(meta_file_id, meta)
    else:
        drive_upload_json(meta, "client.json", client_folder_id)
    logger.info("client.json synchronisé")

    return meta


def load_all_clients_from_drive() -> list:
    if not IS_PROD:
        return []
    root_id = get_root_folder_id()
    client_folders = drive_list_folders(root_id)
    clients = []
    for folder in client_folders:
        try:
            meta_id = drive_find_file("client.json", folder["id"])
            if meta_id:
                meta = drive_read_json(meta_id)
                clients.append(meta)
        except Exception as e:
            logger.error(f"Erreur lecture client {folder['name']} : {e}")
    return clients



def get_root_folder_id() -> str:
    fid = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    if not fid:
        raise RuntimeError("GOOGLE_DRIVE_FOLDER_ID non défini")
    return fid


# ── Opérations Drive de base ──────────────────────────────────────────────────

def drive_create_folder(name: str, parent_id: str) -> str:
    """Crée un dossier Drive, retourne son ID."""
    service = _get_service()
    meta = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


def drive_get_or_create_folder(name: str, parent_id: str) -> str:
    """Retourne l'ID d'un dossier existant ou le crée."""
    service = _get_service()
    q = f"name='{name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=q, fields="files(id,name)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]
    return drive_create_folder(name, parent_id)


def drive_upload_file(local_path: Path, name: str, parent_id: str) -> str:
    """Upload un fichier local vers Drive, retourne l'ID Drive."""
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    meta = {"name": name, "parents": [parent_id]}
    media = MediaIoBaseUpload(io.FileIO(str(local_path), "rb"), mimetype=mime)
    f = service.files().create(body=meta, media_body=media, fields="id").execute()
    return f["id"]


def drive_update_file(file_id: str, local_path: Path):
    """Met à jour un fichier existant sur Drive."""
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    media = MediaIoBaseUpload(io.FileIO(str(local_path), "rb"), mimetype=mime)
    service.files().update(fileId=file_id, media_body=media).execute()


def drive_download_file(file_id: str, local_path: Path):
    """Télécharge un fichier Drive vers le disque local."""
    from googleapiclient.http import MediaIoBaseDownload
    service = _get_service()
    req = service.files().get_media(fileId=file_id)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    with open(str(local_path), "wb") as f:
        downloader = MediaIoBaseDownload(f, req)
        done = False
        while not done:
            _, done = downloader.next_chunk()


def drive_upload_json(data: dict, name: str, parent_id: str) -> str:
    """Upload un dict JSON comme fichier texte sur Drive."""
    service = _get_service()
    content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    meta = {"name": name, "parents": [parent_id]}
    media_body = io.BytesIO(content)
    from googleapiclient.http import MediaIoBaseUpload
    media = MediaIoBaseUpload(media_body, mimetype="application/json")
    f = service.files().create(body=meta, media_body=media, fields="id").execute()
    return f["id"]


def drive_update_json(file_id: str, data: dict):
    """Met à jour un fichier JSON existant sur Drive."""
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype="application/json")
    service.files().update(fileId=file_id, media_body=media).execute()


def drive_read_json(file_id: str) -> dict:
    """Lit un fichier JSON depuis Drive."""
    service = _get_service()
    content = service.files().get_media(fileId=file_id).execute()
    return json.loads(content)


def drive_find_file(name: str, parent_id: str) -> Optional[str]:
    """Trouve un fichier par nom dans un dossier Drive. Retourne l'ID ou None."""
    service = _get_service()
    q = f"name='{name}' and '{parent_id}' in parents and trashed=false"
    results = service.files().list(q=q, fields="files(id)").execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def drive_list_folders(parent_id: str) -> list:
    """Liste les sous-dossiers d'un dossier Drive."""
    service = _get_service()
    q = f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=q, fields="files(id,name)").execute()
    return results.get("files", [])


# ── Opérations haut niveau ────────────────────────────────────────────────────

def sync_client_to_drive(client_dir: Path, meta: dict) -> dict:
    """
    Synchronise un dossier client local vers Drive.
    Crée la structure Drive si elle n'existe pas.
    Met à jour meta avec les IDs Drive.
    Retourne le meta enrichi.
    """
    if not IS_PROD:
        logger.info("Mode dev — sync Drive ignorée")
        return meta

    root_id = get_root_folder_id()
    slug = meta["slug"]

    # Dossier client Drive
    client_folder_id = drive_get_or_create_folder(slug, root_id)
    meta["drive_folder_id"] = client_folder_id

    # Upload ASSOCIATION Excel
    asso_files = list(client_dir.glob("ASSOCIATION_*.xlsx"))
    if asso_files:
        asso_file = asso_files[0]
        existing_id = drive_find_file(asso_file.name, client_folder_id)
        if existing_id:
            drive_update_file(existing_id, asso_file)
            meta["drive_asso_id"] = existing_id
        else:
            meta["drive_asso_id"] = drive_upload_file(asso_file, asso_file.name, client_folder_id)
        logger.info(f"Association Excel synchronisé : {asso_file.name}")

    # Dossier projets Drive
    projets_folder_id = drive_get_or_create_folder("projets", client_folder_id)
    meta["drive_projets_folder_id"] = projets_folder_id

    # Upload budgets projets
    for projet_dir in (client_dir / "projets").iterdir():
        if not projet_dir.is_dir():
            continue
        projet_slug = projet_dir.name
        projet_drive_id = drive_get_or_create_folder(projet_slug, projets_folder_id)

        for budget_file in projet_dir.glob("BUDGET_*.xlsx"):
            existing_id = drive_find_file(budget_file.name, projet_drive_id)
            if existing_id:
                drive_update_file(existing_id, budget_file)
            else:
                drive_upload_file(budget_file, budget_file.name, projet_drive_id)
            logger.info(f"Budget synchronisé : {budget_file.name}")

    # Upload client.json
    meta_file_id = drive_find_file("client.json", client_folder_id)
    if meta_file_id:
        drive_update_json(meta_file_id, meta)
    else:
        drive_upload_json(meta, "client.json", client_folder_id)

    return meta


def load_all_clients_from_drive() -> list:
    """
    Charge la liste de tous les clients depuis Drive.
    Utilisé au démarrage de l'API pour reconstruire l'état.
    """
    if not IS_PROD:
        return []

    root_id = get_root_folder_id()
    client_folders = drive_list_folders(root_id)
    clients = []

    for folder in client_folders:
        try:
            meta_id = drive_find_file("client.json", folder["id"])
            if meta_id:
                meta = drive_read_json(meta_id)
                clients.append(meta)
        except Exception as e:
            logger.error(f"Erreur lecture client {folder['name']} : {e}")

    return clients


def download_client_excel(client_slug: str, local_dir: Path) -> Optional[Path]:
    """
    Télécharge l'Excel Association d'un client depuis Drive vers un dossier local tmp.
    Retourne le chemin local du fichier téléchargé.
    """
    if not IS_PROD:
        matches = list(local_dir.glob("ASSOCIATION_*.xlsx"))
        return matches[0] if matches else None

    root_id = get_root_folder_id()
    service = _get_service()

    # Trouve le dossier client
    q = f"name='{client_slug}' and '{root_id}' in parents and trashed=false"
    results = service.files().list(q=q, fields="files(id)").execute()
    if not results["files"]:
        return None

    client_folder_id = results["files"][0]["id"]

    # Trouve l'Excel Association
    q2 = f"name contains 'ASSOCIATION_' and '{client_folder_id}' in parents and trashed=false"
    results2 = service.files().list(q=q2, fields="files(id,name)").execute()
    if not results2["files"]:
        return None

    file_info = results2["files"][0]
    local_path = local_dir / file_info["name"]
    drive_download_file(file_info["id"], local_path)
    return local_path
