import os
import json
import tempfile
import requests
import pymupdf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from models import CandidateProfile
from template_engine import render_template

app = FastAPI(title="Tritux Python Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:9091"],
    allow_methods=["*"],
    allow_headers=["*"],
)

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/extract-cv")
N8N_SCORING_URL = os.getenv("N8N_SCORING_URL", "http://localhost:5678/webhook/scoring-cv")


@app.get("/health")
def health():
    return {"status": "ok", "service": "tritux-python"}


def normalize_n8n_response(raw) -> dict:
    data = raw
    for _ in range(3):
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                raise ValueError(f"Impossible de parser le JSON: {data[:300]}")
        else:
            break
    if isinstance(data, list):
        if len(data) == 0:
            raise ValueError("Réponse n8n vide (liste vide)")
        first = data[0]
        if isinstance(first, dict) and "json" in first:
            data = first["json"]
        else:
            data = first
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            raise ValueError(f"String non parseable après déroulement: {data[:300]}")
    if not isinstance(data, dict):
        raise ValueError(f"Format inattendu: {type(data).__name__} — {str(data)[:200]}")
    return data


def normalize_profile_fields(profile: dict) -> dict:
    if profile.get("experience_years") is not None:
        profile["experience_years"] = str(profile["experience_years"])
    for field in ("skills", "specific_skills"):
        val = profile.get(field)
        if val is None:
            profile[field] = []
        elif isinstance(val, str):
            profile[field] = [val] if val.strip() else []
        elif isinstance(val, list):
            profile[field] = [str(s) for s in val if s is not None]
    for exp in profile.get("experiences") or []:
        if not isinstance(exp, dict):
            continue
        ach = exp.get("achievements")
        if ach is None:
            exp["achievements"] = []
        elif isinstance(ach, str):
            exp["achievements"] = [ach.strip()] if ach.strip() else []
        elif isinstance(ach, list):
            exp["achievements"] = [str(a) for a in ach if a is not None]
        tech = exp.get("tech_stack")
        if isinstance(tech, list):
            exp["tech_stack"] = ", ".join(str(t) for t in tech if t)
        if not exp.get("company"):
            exp["company"] = "N/A"
        if not exp.get("description"):
            exp["description"] = ""
    for edu in profile.get("education") or []:
        if not isinstance(edu, dict):
            continue
        if not edu.get("year"):
            edu["year"] = ""
        if not edu.get("degree"):
            edu["degree"] = "Inconnu"
        if not edu.get("school"):
            edu["school"] = "Inconnu"
    for lang in profile.get("languages") or []:
        if not isinstance(lang, dict):
            continue
        if not lang.get("name"):
            lang["name"] = "Inconnu"
        if not lang.get("level"):
            lang["level"] = "Inconnu"
    return profile


@app.post("/api/extract")
async def extract_cv(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        extracted_text = ""
        doc = pymupdf.open(tmp_path)
        for page in doc:
            extracted_text += page.get_text()
        doc.close()
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Texte vide dans le PDF.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur extraction PDF: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
    try:
        response = requests.post(N8N_WEBHOOK_URL, json={"cv_text": extracted_text}, timeout=60)
        response.raise_for_status()
        raw_response = response.json()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Timeout : n8n ne répond pas dans les 60s.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail="Impossible de joindre n8n. Est-il démarré ?")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Erreur HTTP n8n: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur n8n: {str(e)}")
    try:
        profile_dict = normalize_n8n_response(raw_response)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Format n8n non reconnu: {str(e)}")
    profile_dict = normalize_profile_fields(profile_dict)
    try:
        profile = CandidateProfile(**profile_dict)
        return profile.model_dump()
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Validation échouée: {str(e)} | Données: {json.dumps(profile_dict, ensure_ascii=False)[:500]}"
        )


@app.post("/api/extract-text")
async def extract_text_only(file: UploadFile = File(...)):
    """Extrait uniquement le texte brut — utilisé pour tests."""
    suffix = os.path.splitext(file.filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        extracted_text = ""
        doc = pymupdf.open(tmp_path)
        for page in doc:
            extracted_text += page.get_text()
        doc.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur extraction PDF: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
    return {"cv_text": extracted_text}


@app.post("/api/extract-and-score")
async def extract_and_score(
    file: UploadFile = File(...),
    candidate_id: str = "",
    job_title: str = "",
    job_description: str = "",
):
    """
    Extrait le texte du CV via PyMuPDF, envoie à n8n pour scoring Groq,
    et retourne { candidate_id, score, scoringDetails }.
    Appelé par Spring Boot CandidateExterneService.
    """
    # 1. Extraire le texte du PDF
    suffix = os.path.splitext(file.filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        extracted_text = ""
        doc = pymupdf.open(tmp_path)
        for page in doc:
            extracted_text += page.get_text()
        doc.close()
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Texte vide dans le PDF.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur extraction PDF: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # 2. Envoyer à n8n pour scoring
    try:
        payload = {
            "candidate_id": candidate_id,
            "cv_text": extracted_text,
            "job_title": job_title,
            "job_description": job_description,
        }
        response = requests.post(N8N_SCORING_URL, json=payload, timeout=60)
        response.raise_for_status()
        raw_response = response.json()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Timeout : n8n scoring ne répond pas dans les 60s.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail="Impossible de joindre n8n scoring. Est-il démarré ?")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Erreur HTTP n8n scoring: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur n8n scoring: {str(e)}")

    # 3. Normaliser la réponse n8n
    try:
        data = normalize_n8n_response(raw_response)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Format réponse n8n non reconnu: {str(e)}")

    # 4. Extraire et contraindre le score entre 0 et 100
    score = None
    if data.get("score") is not None:
        try:
            score = max(0, min(100, int(data["score"])))
        except (ValueError, TypeError):
            score = None

    return {
        "candidate_id": candidate_id,
        "score": score,
        "scoringDetails": json.dumps(data, ensure_ascii=False),
    }


@app.post("/api/transform")
async def transform_cv(profile: CandidateProfile, anonymous: bool = False):
    try:
        output_path = render_template(profile, anonymous=anonymous)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur transformation: {str(e)}")
    candidate_name = profile.nom_candidat.replace(" ", "_")
    return FileResponse(
        output_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"CV_{candidate_name}.docx"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)