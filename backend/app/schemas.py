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

# === 대시보드 응답 스키마 추가 ===
from datetime import datetime
from typing import Optional

class ClassStat(BaseModel):
    label: str          # 클래스명
    total: int          # 총 예측 수
    with_feedback: int  # 피드백 달린 건수
    correct: int        # 정답(피드백 기준) 건수
    accuracy: float     # 정확도(0~1), with_feedback 기준

class MistakeItem(BaseModel):
    id: int
    prediction_id: int
    image_path: str
    predicted_label: str
    score: float
    correct_label: Optional[str] = None
    created_at: datetime


class AccuracyPoint(BaseModel):
    date: str     # 'YYYY-MM-DD'
    total: int
    correct: int
    accuracy: float  # 0~1