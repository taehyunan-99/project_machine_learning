from pydantic import BaseModel
from typing import Optional
class PredictResponse(BaseModel):
    prediction_id: int
    label: str
    score: float
    image_path: str

class FeedbackCreate(BaseModel):
    prediction_id: int
    is_correct: bool
    correct_label: Optional[str] = None
    note: Optional[str] = None

class TrainingResultCreate(BaseModel):
    epoch: int
    train_loss: Optional[float] = None
    val_loss: Optional[float] = None
    metric: Optional[str] = None
    metric_value: Optional[float] = None
