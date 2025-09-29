from fastapi import APIRouter, UploadFile, File, Depends
from uuid import uuid4
import os, shutil
from ..db import get_db
from ..models import Prediction
from ..schemas import PredictResponse

router = APIRouter(tags=["predict"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/predict", response_model=PredictResponse)
def predict(file: UploadFile = File(...), db=Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    fname = f"{uuid4().hex}{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, "wb") as out:
        shutil.copyfileobj(file.file, out)

    label, score = "plastic", 0.50  # TODO: 실제 모델 추론으로 교체
    rec = Prediction(image_path=fpath, label=label, score=score)
    db.add(rec); db.commit(); db.refresh(rec)

    return PredictResponse(prediction_id=rec.id, label=label, score=score, image_path=fpath)
