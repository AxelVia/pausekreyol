# PauseKreyol — Logiciel de gestion culturelle

## Structure du projet

```
pausekreyol/
├── api/
│   └── main.py              # Backend FastAPI
├── engine/
│   ├── template_engine.py   # Génération des dossiers clients
│   ├── excel_reader.py      # Lecture des Excel
│   └── storage.py           # Abstraction stockage (local / Drive)
├── frontend/
│   └── index.html           # Interface web
├── templates/
│   ├── TEMPLATE_ASSOCIATION.xlsx
│   └── TEMPLATE_BUDGET_PROJET.xlsx
├── clients/                 # Généré automatiquement (ignoré par git)
├── requirements.txt
├── Procfile
└── railway.toml
```

## Lancement en local (dev)

```bash
# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Lancer le backend
uvicorn api.main:app --reload

# 3. Ouvrir le frontend
# Double-cliquer sur frontend/index.html
```

L'API est accessible sur http://localhost:8000
La doc interactive est sur http://localhost:8000/docs

## Déploiement Railway (prod)

1. Pusher ce dossier sur GitHub
2. Créer un projet Railway → connecter le repo GitHub
3. Ajouter les variables d'environnement (voir .env.example)
4. Railway déploie automatiquement

## Variables d'environnement requises (prod)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Clé API Claude |
| `GOOGLE_DRIVE_FOLDER_ID` | ID du dossier Drive racine |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON du compte de service Google |
| `GMAIL_CLIENT_ID` | OAuth Gmail |
| `GMAIL_CLIENT_SECRET` | OAuth Gmail |
| `GMAIL_REFRESH_TOKEN` | Token de refresh Gmail |
| `GMAIL_WATCHED_ADDRESS` | Adresse Gmail à surveiller |
| `FRONTEND_URL` | URL Vercel du frontend |
| `ENV` | `production` en prod, vide en dev |
