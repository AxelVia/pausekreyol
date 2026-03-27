"""
PauseKreyol — Moteur de templates
Crée automatiquement un dossier client avec les Excel pré-remplis et interconnectés.
"""

import io
import shutil
import json
from pathlib import Path
from datetime import datetime
from openpyxl import load_workbook

BASE_DIR = Path(__file__).parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
CLIENTS_DIR = BASE_DIR / "clients"

# ─────────────────────────────────────────────
# Mapping des cellules à pré-remplir
# Format : { "NomSheet": { "CellRef": "clé_dans_client_data" } }
# ─────────────────────────────────────────────

TEMPLATES = {
    "asso_france": {
        "label": "Association loi 1901 — France",
        "fichier": "TEMPLATE_ASSOCIATION.xlsx",
        "mapping_asso": "ASSOCIATION_MAPPING",
    },
    "sas_senegal": {
        "label": "SAS OHADA — Sénégal",
        "fichier": "TEMPLATE_SAS_SENEGAL.xlsx",
        "mapping_asso": "SAS_MAPPING",
    },
}

ASSOCIATION_MAPPING = {
    "IDENTITE": {
        "B5": "nom_officiel",
        "B6": "nom_usuel",
        "B7": "siret",
        "B8": "code_ape",
        "B9": "numero_rna",
        "B10": "date_creation",
        "B12": "adresse_siege",
        "B16": "president",
        "B17": "tresorier",
        "B19": "directeur_artistique",
        "B21": "email_contact",
        "B22": "telephone",
        "E6": "licence_type1",
        "E7": "licence_type2",
        "E8": "licence_type3",
    }
}

SAS_MAPPING = {
    "IDENTITE": {
        "B4": "nom_officiel",
        "B5": "nom_usuel",
        "B6": "ninea",
        "B7": "rccm",
        "B8": "capital_social",
        "B9": "date_creation",
        "B10": "adresse_siege",
        "B13": "president",
        "B15": "email_contact",
        "B16": "telephone",
    }
}

# Mapping Budget/Dossier subvention (PARAMETRES → propage vers tous les onglets)
BUDGET_MAPPING = {
    "PARAMETRES": {
        "B4": "nom_projet",
        "B5": "nom_officiel",
        "B6": "siret",
        "B7": "licence_type1",
        "B8": "date_debut_projet",
        "B9": "date_fin_projet",
        "B10": "lieu_projet",
        "B11": "code_aap",
        "B14": "president",
        "B16": "email_contact",
        "B17": "telephone",
        "B18": "adresse_siege",
    }
}

# Mapping Fiche prospect (FICHE PROJET — données asso pré-remplies)
PROSPECT_MAPPING = {
    "FICHE PROJET": {
        "B5":  "nom_usuel",         # Association
        "B6":  "siret",             # SIRET
        "B7":  "licence_type1",     # Licence spectacle
        "B8":  "adresse_siege",     # Siège social
        "B9":  "president",         # Présidente
        "B10": "email_contact",     # Contact prod
        "B13": "nom_projet",        # Nom projet
        "B14": "lieu_projet",       # Lieu
        "B18": "date_debut_projet", # Date début
    }
}


def _fill_workbook(wb, mapping: dict, data: dict) -> int:
    """Remplit les cellules d'un workbook selon le mapping. Retourne le nb de cellules remplies."""
    filled = 0
    for sheet_name, cells in mapping.items():
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        for cell_ref, data_key in cells.items():
            value = data.get(data_key)
            if value is not None and value != "":
                ws[cell_ref] = value
                filled += 1
    return filled


def _workbook_to_bytes(wb) -> bytes:
    """Sérialise un workbook openpyxl en bytes sans passer par le disque."""
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


def create_client_folder(client_data: dict) -> Path:
    """
    Crée le dossier complet d'un nouveau client.
    Les Excel sont générés en mémoire et uploadés directement sur Drive.
    """
    nom = client_data.get("nom_usuel") or client_data.get("nom_officiel", "NOUVEAU_CLIENT")
    type_structure = client_data.get("type_structure", "asso_france")
    slug = "".join(c if c.isalnum() or c in " _-" else "_" for c in nom).strip().replace(" ", "_")
    timestamp = datetime.now().strftime("%Y%m")

    client_dir = CLIENTS_DIR / f"{slug}_{timestamp}"
    projets_dir = client_dir / "projets"
    client_dir.mkdir(parents=True, exist_ok=True)
    projets_dir.mkdir(exist_ok=True)
    (client_dir / "documents").mkdir(exist_ok=True)

    # ── Choix du template ───────────────────────────────────────────
    tpl_config = TEMPLATES.get(type_structure, TEMPLATES["asso_france"])
    mapping_name = tpl_config["mapping_asso"]
    mapping = ASSOCIATION_MAPPING if mapping_name == "ASSOCIATION_MAPPING" else SAS_MAPPING

    # ── 1. Génère Excel Association en mémoire ──────────────────────
    asso_src = TEMPLATES_DIR / tpl_config["fichier"]
    asso_name = f"STRUCTURE_{slug}.xlsx"
    wb_asso = load_workbook(str(asso_src))
    filled = _fill_workbook(wb_asso, mapping, client_data)
    asso_bytes = _workbook_to_bytes(wb_asso)
    print(f"  ✅ Structure : {asso_name} ({filled} cellules pré-remplies)")

    # Sauvegarde locale aussi (pour lecture ultérieure si Railway la garde)
    asso_dst = client_dir / asso_name
    asso_dst.write_bytes(asso_bytes)

    # ── 2. Génère Budget en mémoire ─────────────────────────────────
    budget_src = TEMPLATES_DIR / "TEMPLATE_BUDGET_PROJET.xlsx"
    budget_name = f"BUDGET_PROJET_VIERGE_{slug}.xlsx"
    wb_budget = load_workbook(str(budget_src))
    filled = _fill_workbook(wb_budget, BUDGET_MAPPING, client_data)
    budget_bytes = _workbook_to_bytes(wb_budget)
    print(f"  ✅ Budget projet : {budget_name} ({filled} cellules pré-remplies)")

    budget_dst = projets_dir / budget_name
    budget_dst.write_bytes(budget_bytes)

    # ── 3. Metadata ─────────────────────────────────────────────────
    meta = {
        "slug": slug,
        "created_at": datetime.now().isoformat(),
        "client_data": client_data,
        "projets": []
    }
    meta_path = client_dir / "client.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"  ✅ Metadata : client.json")

    # ── 4. Upload direct vers Drive (bytes en mémoire) ───────────────
    try:
        from engine.drive_storage import drive_get_or_create_folder, drive_upload_bytes, drive_upload_json, get_root_folder_id
        import os
        if os.getenv("ENV") == "production":
            root_id = get_root_folder_id()
            client_folder_id = drive_get_or_create_folder(slug, root_id)
            meta["drive_folder_id"] = client_folder_id

            # Upload Excel association
            asso_id = drive_upload_bytes(asso_bytes, asso_name, client_folder_id)
            meta["drive_asso_id"] = asso_id
            print(f"  ✅ Drive : {asso_name} uploadé")

            # Dossier projets + budget
            projets_folder_id = drive_get_or_create_folder("projets", client_folder_id)
            meta["drive_projets_folder_id"] = projets_folder_id
            drive_upload_bytes(budget_bytes, budget_name, projets_folder_id)
            print(f"  ✅ Drive : {budget_name} uploadé")

            # client.json
            drive_upload_json(meta, "client.json", client_folder_id)
            print(f"  ✅ Drive : client.json uploadé")

            # Met à jour le json local avec les IDs Drive
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    except Exception as e:
        import traceback
        print(f"  ❌ Drive upload ERREUR : {e}")
        print(traceback.format_exc())

    # ── 5. Journal d'événements ─────────────────────────────────────
    try:
        from engine.historisation import append_event, add_timestamps
        meta = add_timestamps(meta, "creation_dossier", {
            "type_structure": client_data.get("type_structure"),
            "nom": client_data.get("nom_officiel"),
        })
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        append_event(client_dir, "creation_dossier", {
            "nom_officiel": client_data.get("nom_officiel"),
            "type_structure": client_data.get("type_structure"),
            "fichiers": [asso_name, budget_name],
        })
    except Exception as e:
        print(f"  ⚠️  Historisation ignorée : {e}")

    return client_dir


def create_project(client_slug: str, project_data: dict) -> Path:
    """
    Crée un nouveau projet pour un client existant.
    Génère 2 fichiers Excel :
    - FICHE_PROSPECT : collecte infos + artistes + budget simplifié + faisabilité
    - DOSSIER_SUBVENTION : budget maître complet + salaires + ETPT + Mairie + partenaires
    """
    matches = list(CLIENTS_DIR.glob(f"{client_slug}*"))
    if not matches:
        raise ValueError(f"Client '{client_slug}' non trouvé")
    client_dir = matches[0]

    meta_path = client_dir / "client.json"
    meta = json.loads(meta_path.read_text())
    client_data = meta["client_data"]
    merged = {**client_data, **project_data}

    nom_projet = project_data.get("nom_projet", "PROJET")
    slug_projet = "".join(c if c.isalnum() or c in " _-" else "_" for c in nom_projet).replace(" ", "_")

    projet_dir = client_dir / "projets" / slug_projet
    projet_dir.mkdir(parents=True, exist_ok=True)

    fichiers_generes = []
    drive_ids = {}

    # ── 1. Fiche prospect (collecte + artistes + faisabilité) ──────
    prospect_src = TEMPLATES_DIR / "TEMPLATE_FICHE_PROSPECT.xlsx"
    if prospect_src.exists():
        prospect_name = f"FICHE_PROSPECT_{slug_projet}.xlsx"
        wb_prospect = load_workbook(str(prospect_src))
        # Titre dynamique
        ws_fp = wb_prospect["FICHE PROJET"]
        ws_fp["A1"] = f"FICHE DE COLLECTE PROSPECT — {nom_projet}"
        filled = _fill_workbook(wb_prospect, PROSPECT_MAPPING, merged)
        prospect_bytes = _workbook_to_bytes(wb_prospect)
        (projet_dir / prospect_name).write_bytes(prospect_bytes)
        fichiers_generes.append(prospect_name)
        print(f"  ✅ Fiche prospect : {prospect_name} ({filled} cellules pré-remplies)")
    else:
        prospect_bytes = None
        prospect_name = None

    # ── 2. Dossier subvention complet (budget maître + tous onglets) ─
    subv_src = TEMPLATES_DIR / "TEMPLATE_DOSSIER_SUBVENTION.xlsx"
    subv_name = f"DOSSIER_SUBVENTION_{slug_projet}.xlsx"
    wb_subv = load_workbook(str(subv_src))
    filled = _fill_workbook(wb_subv, BUDGET_MAPPING, merged)
    subv_bytes = _workbook_to_bytes(wb_subv)
    (projet_dir / subv_name).write_bytes(subv_bytes)
    fichiers_generes.append(subv_name)
    print(f"  ✅ Dossier subvention : {subv_name} ({filled} cellules pré-remplies)")

    # ── 3. Met à jour le meta ───────────────────────────────────────
    projet_entry = {
        "nom": nom_projet,
        "slug": slug_projet,
        "created_at": datetime.now().isoformat(),
        "statut": "en_construction",
        "dates": {
            "debut": project_data.get("date_debut_projet"),
            "fin": project_data.get("date_fin_projet"),
        },
        "lieu": project_data.get("lieu_projet"),
        "code_aap": project_data.get("code_aap"),
        "fichiers": fichiers_generes,
    }
    meta["projets"].append(projet_entry)

    # ── 4. Historisation ────────────────────────────────────────────
    try:
        from engine.historisation import append_event, add_timestamps
        meta = add_timestamps(meta, "creation_projet", {"nom_projet": nom_projet})
        append_event(client_dir, "creation_projet", {
            "nom_projet": nom_projet,
            "slug_projet": slug_projet,
            "fichiers": fichiers_generes,
        })
    except Exception as e:
        print(f"  ⚠️  Historisation ignorée : {e}")

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    # ── 5. Upload Drive ─────────────────────────────────────────────
    try:
        from engine.drive_storage import (
            drive_get_or_create_folder, drive_upload_bytes,
            drive_find_file, drive_update_json
        )
        import os
        if os.getenv("ENV") == "production" and meta.get("drive_projets_folder_id"):
            projets_folder_id = meta["drive_projets_folder_id"]
            projet_drive_id = drive_get_or_create_folder(slug_projet, projets_folder_id)

            # Stocke les IDs individuels des fichiers
            drive_fichiers = {}

            if prospect_bytes and prospect_name:
                fid = drive_upload_bytes(prospect_bytes, prospect_name, projet_drive_id)
                drive_fichiers["fiche_prospect_id"] = fid
                drive_fichiers["fiche_prospect_name"] = prospect_name
                print(f"  ✅ Drive : {prospect_name} (id={fid})")

            fid = drive_upload_bytes(subv_bytes, subv_name, projet_drive_id)
            drive_fichiers["dossier_subvention_id"] = fid
            drive_fichiers["dossier_subvention_name"] = subv_name
            drive_fichiers["projet_folder_id"] = projet_drive_id
            print(f"  ✅ Drive : {subv_name} (id={fid})")

            # Enrichit l'entrée projet avec les IDs Drive
            for p in meta["projets"]:
                if p["slug"] == slug_projet:
                    p["drive"] = drive_fichiers
                    break

            # Met à jour client.json sur Drive
            client_folder_id = meta.get("drive_folder_id")
            if client_folder_id:
                meta_id = drive_find_file("client.json", client_folder_id)
                if meta_id:
                    drive_update_json(meta_id, meta)
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"  ⚠️  Drive upload projet ignoré : {e}")

    return projet_dir


def list_clients() -> list:
    """Retourne la liste de tous les clients."""
    clients = []
    for client_dir in CLIENTS_DIR.iterdir():
        meta_path = client_dir / "client.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            clients.append({
                "slug": meta["slug"],
                "nom": meta["client_data"].get("nom_usuel") or meta["client_data"].get("nom_officiel"),
                "siret": meta["client_data"].get("siret"),
                "nb_projets": len(meta.get("projets", [])),
                "created_at": meta["created_at"],
                "dossier": str(client_dir),
            })
    return clients


# ─────────────────────────────────────────────
# CLI rapide pour tester
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    print("\n🎭 PauseKreyol — Moteur de templates\n")

    # Exemple : créer House of Bastet
    hob_data = {
        "nom_officiel": "House of Bastet",
        "nom_usuel": "House of Bastet (HOB)",
        "siret": "93280087300014",
        "code_ape": "9001Z",
        "president": "Madame Djenabou CISSE",
        "email_contact": "cie.underground.dance.providers@gmail.com",
        "telephone": "+33 06 58 91 08 14",
        "adresse_siege": "20 rue Primo Levy, 93000 Bobigny",
        "licence_type1": "PLATESV-D-2025-001444",
        "date_creation": "2024-09-01",
    }

    print("📁 Création du dossier client : House of Bastet")
    client_dir = create_client_folder(hob_data)
    print(f"\n📂 Dossier créé : {client_dir}\n")

    print("📋 Création d'un projet : Bastet Festival #5")
    projet_dir = create_project("House_of_Bastet", {
        "nom_projet": "Bastet Festival #5 — Oct 2026",
        "date_debut_projet": "2026-10-22",
        "date_fin_projet": "2026-10-24",
        "lieu_projet": "La Place, Paris",
        "code_aap": "HHP26S2",
    })
    print(f"\n📂 Projet créé : {projet_dir}\n")

    print("📊 Clients existants :")
    for c in list_clients():
        print(f"  • {c['nom']} — SIRET {c['siret']} — {c['nb_projets']} projet(s)")
