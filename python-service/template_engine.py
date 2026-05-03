import os
from docxtpl import DocxTemplate
from models import CandidateProfile

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "templates", "templateTritux_.docx")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")


def render_template(profile: CandidateProfile, anonymous: bool = False) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Charger le template DOCX
    doc = DocxTemplate(TEMPLATE_PATH)

    # Préparer les données
    context = profile.model_dump()

    if anonymous:
        context["nom_candidat"] = "Candidat Anonyme"

    # Rendu DIRECT dans le document (sans casser le format)
    doc.render(context)

    # Sauvegarde
    candidate_name = context.get("nom_candidat", "unknown").replace(" ", "_")
    output_path = os.path.join(OUTPUT_DIR, f"CV_{candidate_name}.docx")

    doc.save(output_path)

    return output_path
