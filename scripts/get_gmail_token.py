"""
Script à lancer UNE SEULE FOIS en local pour obtenir le refresh_token Gmail.
Lance : python scripts/get_gmail_token.py

Il va ouvrir ton navigateur pour que tu te connectes à Gmail.
Une fois autorisé, il affiche les tokens à copier dans Railway.
"""

import json
import os
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/drive",
]

# Mets ici le chemin vers ton fichier JSON téléchargé depuis Google Cloud
CREDENTIALS_FILE = Path(__file__).parent / "client_secret.json"

def main():
    if not CREDENTIALS_FILE.exists():
        print(f"❌ Fichier introuvable : {CREDENTIALS_FILE}")
        print("   Place ton fichier JSON Google Cloud dans scripts/client_secret.json")
        return

    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
    creds = flow.run_local_server(port=0)

    print("\n✅ Authentification réussie !\n")
    print("=" * 60)
    print("Copie ces valeurs dans les variables Railway :\n")
    print(f"GMAIL_CLIENT_ID={creds.client_id}")
    print(f"GMAIL_CLIENT_SECRET={creds.client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={creds.refresh_token}")
    print("=" * 60)

    # Sauvegarde aussi dans un fichier local (ne pas pusher sur git !)
    token_data = {
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "refresh_token": creds.refresh_token,
    }
    out = Path(__file__).parent / "gmail_tokens.json"
    out.write_text(json.dumps(token_data, indent=2))
    print(f"\n💾 Aussi sauvegardé dans : {out}")
    print("⚠️  Ne pousse PAS ce fichier sur GitHub !")

if __name__ == "__main__":
    main()
