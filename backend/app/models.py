from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base
class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)
    label = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    feedbacks = relationship("Feedback", back_populates="prediction")

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    correct_label = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    prediction = relationship("Prediction", back_populates="feedbacks")

class TrainingResult(Base):
    __tablename__ = "training_results"
    id = Column(Integer, primary_key=True)
    epoch = Column(Integer, nullable=False)
    train_loss = Column(Float)
    val_loss = Column(Float)
    metric = Column(String)        # e.g. "accuracy", "mAP50"
    metric_value = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
