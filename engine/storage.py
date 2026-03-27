"""
PauseKreyol — Stockage Google Drive
Remplace le système de fichiers local en production.
En dev local : utilise le dossier clients/ sur le PC.
En production : lit/écrit sur Google Drive.
"""

import os
import io
import json
import shutil
from pathlib import Path

# Détecte si on est en prod (Railway) ou en dev (local)
IS_PROD = os.getenv("ENV") == "production"

if IS_PROD:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload


def get_drive_service():
    """Retourne le client Google Drive (prod uniquement)."""
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not sa_json:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON non défini")
    info = json.loads(sa_json)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive"]
    )
    return build("drive", "v3", credentials=creds)


def get_root_folder_id() -> str:
    return os.getenv("GOOGLE_DRIVE_FOLDER_ID", "root")


# ── Opérations Drive ──────────────────────────────────────────────────────────

def drive_create_folder(name: str, parent_id: str) -> str:
    """Crée un dossier Drive, retourne son ID."""
    service = get_drive_service()
    meta = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


def drive_upload_file(local_path: Path, name: str, parent_id: str) -> str:
    """Upload un fichier local vers Drive, retourne l'ID Drive."""
    service = get_drive_service()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    meta = {"name": name, "parents": [parent_id]}
    media = MediaIoBaseUpload(io.FileIO(local_path, "rb"), mimetype=mime)
    f = service.files().create(body=meta, media_body=media, fields="id").execute()
    return f["id"]


def drive_download_file(file_id: str, local_path: Path):
    """Télécharge un fichier Drive vers le disque local (tmp)."""
    service = get_drive_service()
    req = service.files().get_media(fileId=file_id)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    with open(local_path, "wb") as f:
        downloader = MediaIoBaseDownload(f, req)
        done = False
        while not done:
            _, done = downloader.next_chunk()


def drive_list_files(parent_id: str) -> list:
    """Liste les fichiers dans un dossier Drive."""
    service = get_drive_service()
    q = f"'{parent_id}' in parents and trashed=false"
    results = service.files().list(q=q, fields="files(id,name,mimeType)").execute()
    return results.get("files", [])


def drive_update_file(file_id: str, local_path: Path):
    """Met à jour un fichier existant sur Drive."""
    service = get_drive_service()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    media = MediaIoBaseUpload(io.FileIO(local_path, "rb"), mimetype=mime)
    service.files().update(fileId=file_id, media_body=media).execute()


# ── Interface unifiée (dev + prod) ────────────────────────────────────────────

class Storage:
    """
    Interface unique pour lire/écrire des fichiers.
    En dev : dossier local.
    En prod : Google Drive.
    """

    def __init__(self):
        self.is_prod = IS_PROD
        if not IS_PROD:
            self.base = Path(__file__).parent.parent / "clients"
            self.base.mkdir(exist_ok=True)

    def get_clients_root(self):
        if self.is_prod:
            return get_root_folder_id()
        return self.base

    def client_exists(self, slug: str) -> bool:
        if self.is_prod:
            service = get_drive_service()
            q = f"name contains '{slug}' and '{get_root_folder_id()}' in parents and trashed=false"
            r = service.files().list(q=q, fields="files(id)").execute()
            return len(r.get("files", [])) > 0
        return bool(list(self.base.glob(f"{slug}*")))

    def list_client_dirs(self):
        """Retourne les dossiers clients (local) ou IDs Drive (prod)."""
        if self.is_prod:
            return drive_list_files(get_root_folder_id())
        return [d for d in self.base.iterdir() if d.is_dir()]

    def read_meta(self, slug: str) -> dict:
        if self.is_prod:
            # Télécharge le client.json depuis Drive
            service = get_drive_service()
            q = f"name='{slug}_meta.json' and trashed=false"
            r = service.files().list(q=q, fields="files(id)").execute()
            if not r["files"]:
                return {}
            file_id = r["files"][0]["id"]
            content = service.files().get_media(fileId=file_id).execute()
            return json.loads(content)
        matches = list(self.base.glob(f"{slug}*/client.json"))
        if not matches:
            return {}
        return json.loads(matches[0].read_text())

    def write_meta(self, slug: str, meta: dict):
        if not self.is_prod:
            matches = list(self.base.glob(f"{slug}*"))
            if matches:
                (matches[0] / "client.json").write_text(
                    json.dumps(meta, ensure_ascii=False, indent=2)
                )


# Singleton
storage = Storage()
