"""
PauseKreyol — Agent Gmail
Tourne en arrière-plan, surveille la boîte mail toutes les 5 minutes.
Détecte les mails avec Excel en pièce jointe et crée des tâches.
"""

import os
import json
import base64
import tempfile
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import anthropic
from openpyxl import load_workbook

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

# Fichier local pour tracker les mails déjà traités
PROCESSED_FILE = Path(__file__).parent.parent / "clients" / ".processed_emails.json"


# ── Auth Gmail ────────────────────────────────────────────────────────────────

def get_gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=os.environ["GMAIL_REFRESH_TOKEN"],
        client_id=os.environ["GMAIL_CLIENT_ID"],
        client_secret=os.environ["GMAIL_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


# ── Tracking mails traités ────────────────────────────────────────────────────

def load_processed() -> set:
    PROCESSED_FILE.parent.mkdir(parents=True, exist_ok=True)
    if PROCESSED_FILE.exists():
        return set(json.loads(PROCESSED_FILE.read_text()))
    return set()


def save_processed(ids: set):
    PROCESSED_FILE.write_text(json.dumps(list(ids)))


# ── Lecture des mails ─────────────────────────────────────────────────────────

def get_unread_with_excel(service) -> list:
    """Récupère les mails non lus avec une pièce jointe Excel."""
    results = service.users().messages().list(
        userId="me",
        q="is:unread has:attachment filename:xlsx OR filename:xls",
        maxResults=20,
    ).execute()
    return results.get("messages", [])


def get_message_details(service, msg_id: str) -> dict:
    """Retourne les détails complets d'un mail."""
    msg = service.users().messages().get(
        userId="me", id=msg_id, format="full"
    ).execute()

    headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}

    details = {
        "id": msg_id,
        "subject": headers.get("Subject", "(sans objet)"),
        "from": headers.get("From", ""),
        "date": headers.get("Date", ""),
        "snippet": msg.get("snippet", ""),
        "attachments": [],
    }

    def extract_parts(parts):
        for part in parts:
            if part.get("parts"):
                extract_parts(part["parts"])
            filename = part.get("filename", "")
            if filename.endswith((".xlsx", ".xls")):
                details["attachments"].append({
                    "filename": filename,
                    "attachment_id": part["body"].get("attachmentId"),
                    "msg_id": msg_id,
                })

    extract_parts(msg["payload"].get("parts", []))
    return details


def download_attachment(service, msg_id: str, attachment_id: str) -> bytes:
    """Télécharge une pièce jointe, retourne les bytes."""
    att = service.users().messages().attachments().get(
        userId="me", messageId=msg_id, id=attachment_id
    ).execute()
    return base64.urlsafe_b64decode(att["data"])


# ── Analyse IA ────────────────────────────────────────────────────────────────

def detect_client_from_email(sender_email: str, clients_dir) -> Optional[str]:
    """
    Cherche quel client est associé à une adresse email expéditeur.
    Retourne le nom du client ou None.
    """
    from pathlib import Path
    import json
    clients_dir = Path(clients_dir)
    if not clients_dir.exists():
        return None
    for client_dir in clients_dir.iterdir():
        meta_path = client_dir / "client.json"
        if not meta_path.exists():
            continue
        meta = json.loads(meta_path.read_text())
        cd = meta.get("client_data", {})
        emails = cd.get("emails_surveillance", [])
        email_contact = cd.get("email_contact", "")
        all_emails = emails + ([email_contact] if email_contact else [])
        for e in all_emails:
            if e.lower() in sender_email.lower():
                return cd.get("nom_usuel") or cd.get("nom_officiel")
    return None
    """
    Claude analyse le mail + l'Excel et retourne une tâche structurée.
    Retourne : { titre, priorite, description, client_detecte, actions_suggérées }
    """
    client_ai = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Tu es l'assistant de Pause Kreyol, une administratrice de production culturelle.

Tu reçois un mail avec un fichier Excel en pièce jointe.

MAIL :
- De : {mail_details['from']}
- Objet : {mail_details['subject']}
- Date : {mail_details['date']}
- Extrait : {mail_details['snippet']}

CONTENU EXCEL DÉTECTÉ :
{json.dumps(excel_summary, ensure_ascii=False, indent=2)}

Analyse ce mail et génère une tâche de validation. Réponds UNIQUEMENT en JSON valide, sans markdown :
{{
  "titre": "Titre court de la tâche (max 80 caractères)",
  "priorite": "URGENT ou Attention ou Normal",
  "description": "Description claire de ce que l'administratrice doit vérifier ou valider (2-3 phrases)",
  "client_detecte": "Nom du client/association si identifiable, sinon null",
  "type": "validation_excel ou nouveau_client ou information ou autre",
  "actions_suggerees": ["action 1", "action 2"],
  "impacts_detectes": ["impact sur les données détecté si applicable"]
}}"""

    response = client_ai.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # Nettoie les éventuels backticks markdown
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    return json.loads(raw)


def summarize_excel(filepath: Path) -> dict:
    """Extrait un résumé des données clés de l'Excel pour Claude."""
    summary = {"sheets": [], "key_values": {}}
    try:
        wb = load_workbook(filepath, data_only=True)
        summary["sheets"] = wb.sheetnames
        # Lit les 3 premières lignes non vides de chaque onglet
        for sname in wb.sheetnames[:4]:
            ws = wb[sname]
            rows = []
            for row in ws.iter_rows(max_row=10, values_only=True):
                vals = [v for v in row if v is not None]
                if vals:
                    rows.append(vals[:5])
                if len(rows) >= 3:
                    break
            if rows:
                summary["key_values"][sname] = rows
    except Exception as e:
        summary["error"] = str(e)
    return summary


# ── Création de tâche ─────────────────────────────────────────────────────────

def create_task(task_data: dict, mail_details: dict) -> dict:
    """
    Crée une tâche dans le système.
    En prod : appelle l'API interne.
    En dev : sauvegarde dans un fichier JSON local.
    """
    task = {
        "id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "created_at": datetime.now().isoformat(),
        "source": "Gmail",
        "mail_from": mail_details["from"],
        "mail_subject": mail_details["subject"],
        "mail_date": mail_details["date"],
        "attachments": [a["filename"] for a in mail_details["attachments"]],
        **task_data,
        "done": False,
    }

    # Sauvegarde locale
    tasks_file = Path(__file__).parent.parent / "clients" / "tasks.json"
    tasks_file.parent.mkdir(parents=True, exist_ok=True)

    tasks = []
    if tasks_file.exists():
        tasks = json.loads(tasks_file.read_text())
    tasks.append(task)
    tasks_file.write_text(json.dumps(tasks, ensure_ascii=False, indent=2))

    logger.info(f"Tâche créée : {task['titre']} [{task['priorite']}]")
    return task


# ── Boucle principale ─────────────────────────────────────────────────────────

def run_agent():
    """
    Lance un cycle de l'agent :
    1. Récupère les mails non lus avec Excel
    2. Pour chaque mail non encore traité : analyse + crée une tâche
    3. Marque le mail comme lu
    """
    logger.info("Agent Gmail — début du cycle")

    try:
        service = get_gmail_service()
    except Exception as e:
        logger.error(f"Erreur auth Gmail : {e}")
        return

    processed = load_processed()
    messages = get_unread_with_excel(service)
    new_tasks = []

    for msg_ref in messages:
        msg_id = msg_ref["id"]
        if msg_id in processed:
            continue

        try:
            details = get_message_details(service, msg_id)
            if not details["attachments"]:
                processed.add(msg_id)
                continue

            # Détecte le client depuis l'adresse expéditeur
            from pathlib import Path
            clients_dir = Path(__file__).parent.parent / "clients"
            client_detecte = detect_client_from_email(details["from"], clients_dir)
            if client_detecte:
                details["client_hint"] = client_detecte
                logger.info(f"Client détecté automatiquement : {client_detecte}")

            logger.info(f"Traitement : {details['subject']} (de {details['from']})")

            # Télécharge le premier Excel trouvé
            att = details["attachments"][0]
            att_bytes = download_attachment(service, msg_id, att["attachment_id"])

            with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                tmp.write(att_bytes)
                tmp_path = Path(tmp.name)

            # Analyse l'Excel
            excel_summary = summarize_excel(tmp_path)
            tmp_path.unlink()

            # Analyse IA
            task_data = analyze_with_claude(details, excel_summary)

            # Crée la tâche
            task = create_task(task_data, details)
            new_tasks.append(task)

            # Marque comme lu
            service.users().messages().modify(
                userId="me",
                id=msg_id,
                body={"removeLabelIds": ["UNREAD"]},
            ).execute()

            processed.add(msg_id)

        except Exception as e:
            logger.error(f"Erreur sur mail {msg_id} : {e}")
            processed.add(msg_id)  # évite de boucler sur une erreur

    save_processed(processed)
    logger.info(f"Cycle terminé — {len(new_tasks)} nouvelle(s) tâche(s) créée(s)")
    return new_tasks


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    tasks = run_agent()
    if tasks:
        print(f"\n{len(tasks)} tâche(s) créée(s) :")
        for t in tasks:
            print(f"  [{t['priorite']}] {t['titre']}")
    else:
        print("Aucun nouveau mail à traiter.")
