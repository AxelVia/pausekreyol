"""
PauseKreyol — Parseur de fiche client
Lit un Excel de saisie client et extrait les données structurées.
"""

import io
import logging
from pathlib import Path
from typing import Optional
from openpyxl import load_workbook

logger = logging.getLogger(__name__)

def detect_template_type(wb) -> str:
    sheets = wb.sheetnames
    if "FICHE_CLIENT" in sheets:
        ws = wb["FICHE_CLIENT"]
        marker = ws["A3"].value or ""
        if "PAUSEKREYOL_INTAKE_FORM" in str(marker):
            return "intake_form"
    if "IDENTITE" in sheets and "CAISSES" in sheets:
        ws = wb["IDENTITE"]
        title = ws["A1"].value or ""
        if "OHADA" in str(title) or "SAS" in str(title):
            return "structure_sn"
        return "structure_fr"
    return "unknown"

def _val(ws, ref) -> Optional[str]:
    v = ws[ref].value
    if v is None or str(v).strip() == "":
        return None
    return str(v).strip()

def parse_intake_form(wb) -> dict:
    ws = wb["FICHE_CLIENT"]
    type_raw = (_val(ws, "D6") or "").lower()
    if "sas" in type_raw or "sénégal" in type_raw or "senegal" in type_raw or "ohada" in type_raw:
        type_structure = "sas_senegal"
    else:
        type_structure = "asso_france"

    identifiant = _val(ws, "D7") or ""
    rna_rccm = _val(ws, "D8") or ""

    client_data = {
        "type_structure": type_structure,
        "pays": _val(ws, "D10") or "France",
        "nom_officiel": _val(ws, "B6"),
        "nom_usuel": _val(ws, "B7"),
        "date_creation": _val(ws, "B8"),
        "adresse_siege": _val(ws, "B9"),
        "code_ape": _val(ws, "D9"),
        "siret": identifiant if type_structure == "asso_france" else None,
        "ninea": identifiant if type_structure == "sas_senegal" else None,
        "numero_rna": rna_rccm if type_structure == "asso_france" else None,
        "rccm": rna_rccm if type_structure == "sas_senegal" else None,
        "president": _val(ws, "B13"),
        "tresorier": _val(ws, "B14"),
        "secretaire": _val(ws, "B15"),
        "directeur_artistique": _val(ws, "B16"),
        "email_contact": _val(ws, "D13"),
        "telephone": _val(ws, "D14"),
        "site_internet": _val(ws, "D15"),
        "licence_type1": _val(ws, "B28"),
        "date_expiration_licence": _val(ws, "D28"),
        "numero_urssaf": _val(ws, "B29"),
        "numero_guso": _val(ws, "D29"),
        "numero_audiens": _val(ws, "B30"),
        "numero_afdas": _val(ws, "D30"),
        "numero_conges_spectacles": _val(ws, "B31"),
        "mutuelle": _val(ws, "D31"),
        "commentaires": _val(ws, "A40"),
    }

    projet_data = None
    nom_projet = _val(ws, "B19")
    if nom_projet:
        projet_data = {
            "nom_projet": nom_projet,
            "type_projet": _val(ws, "D19"),
            "date_debut_projet": _val(ws, "B20"),
            "date_fin_projet": _val(ws, "D20"),
            "lieu_projet": _val(ws, "B21"),
            "budget_estime": _val(ws, "B22"),
            "code_aap": _val(ws, "D22"),
            "description_courte": _val(ws, "B23"),
            "description_longue": _val(ws, "A25"),
        }

    return {
        "source": "intake_form",
        "type_structure": type_structure,
        "client_data": {k: v for k, v in client_data.items() if v},
        "projet_data": projet_data,
        "docs_disponibles": {},
    }

def parse_structure_fr(wb) -> dict:
    ws = wb["IDENTITE"]
    client_data = {
        "type_structure": "asso_france",
        "nom_officiel": _val(ws, "B5"),
        "nom_usuel": _val(ws, "B6"),
        "siret": _val(ws, "B7"),
        "code_ape": _val(ws, "B8"),
        "numero_rna": _val(ws, "B9"),
        "date_creation": _val(ws, "B10"),
        "adresse_siege": _val(ws, "B12"),
        "president": _val(ws, "B16"),
        "tresorier": _val(ws, "B17"),
        "directeur_artistique": _val(ws, "B19"),
        "email_contact": _val(ws, "B21"),
        "telephone": _val(ws, "B22"),
        "licence_type1": _val(ws, "E6"),
        "licence_type2": _val(ws, "E7"),
        "licence_type3": _val(ws, "E8"),
    }
    return {
        "source": "structure_fr",
        "type_structure": "asso_france",
        "client_data": {k: v for k, v in client_data.items() if v},
        "projet_data": None,
        "docs_disponibles": {},
    }

def parse_structure_sn(wb) -> dict:
    ws = wb["IDENTITE"]
    client_data = {
        "type_structure": "sas_senegal",
        "nom_officiel": _val(ws, "B4"),
        "nom_usuel": _val(ws, "B5"),
        "ninea": _val(ws, "B6"),
        "rccm": _val(ws, "B7"),
        "capital_social": _val(ws, "B8"),
        "date_creation": _val(ws, "B9"),
        "adresse_siege": _val(ws, "B10"),
        "president": _val(ws, "B13"),
        "email_contact": _val(ws, "B15"),
        "telephone": _val(ws, "B16"),
    }
    return {
        "source": "structure_sn",
        "type_structure": "sas_senegal",
        "client_data": {k: v for k, v in client_data.items() if v},
        "projet_data": None,
        "docs_disponibles": {},
    }

def parse_excel_bytes(content: bytes, filename: str = "") -> dict:
    try:
        wb = load_workbook(io.BytesIO(content), data_only=True)
        template_type = detect_template_type(wb)
        logger.info(f"Template détecté : {template_type} ({filename})")
        if template_type == "intake_form":
            return parse_intake_form(wb)
        elif template_type == "structure_fr":
            return parse_structure_fr(wb)
        elif template_type == "structure_sn":
            return parse_structure_sn(wb)
        else:
            return {
                "source": "unknown",
                "type_structure": None,
                "client_data": {},
                "projet_data": None,
                "warning": f"Format non reconnu : {filename}"
            }
    except Exception as e:
        logger.error(f"Erreur parsing {filename} : {e}")
        return {"source": "error", "client_data": {}, "error": str(e)}

def parse_excel_file(path: Path) -> dict:
    return parse_excel_bytes(path.read_bytes(), path.name)

def diff_client_data(existing: dict, incoming: dict) -> dict:
    changes = {}
    for key, new_val in incoming.items():
        if not new_val:
            continue
        old_val = existing.get(key)
        if old_val != new_val:
            changes[key] = {"avant": old_val, "après": new_val}
    return changes
