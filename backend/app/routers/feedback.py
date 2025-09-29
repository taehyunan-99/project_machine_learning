from fastapi import APIRouter, Depends
from ..db import get_db
from ..models import Feedback
from ..schemas import FeedbackCreate

router = APIRouter(tags=["feedback"])

@router.post("/feedback")
def create_feedback(payload: FeedbackCreate, db=Depends(get_db)):
    fb = Feedback(**payload.dict())
    db.add(fb); db.commit(); db.refresh(fb)
    return {"ok": True, "id": fb.id}
