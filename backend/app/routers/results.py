from fastapi import APIRouter, Depends
from ..db import get_db
from ..models import TrainingResult

router = APIRouter(tags=["results"])

@router.post("/results")
def post_result(payload: dict, db=Depends(get_db)):
    item = TrainingResult(**payload)
    db.add(item); db.commit(); db.refresh(item)
    return {"ok": True, "id": item.id}

@router.get("/results")
def list_results(db=Depends(get_db)):
    return db.query(TrainingResult).order_by(TrainingResult.id.desc()).limit(100).all()
