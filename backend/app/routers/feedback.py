# 피드백 API 라우터
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import sys
import os

# 데이터베이스 모듈 import
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from database import get_db

router = APIRouter(tags=["feedback"])

# 요청 모델
class FeedbackRequest(BaseModel):
    predicted_class: str
    actual_class: str
    confidence: float

# 피드백 저장
@router.post("/api/feedback")
async def save_feedback(data: FeedbackRequest):
    """
    사용자 피드백을 데이터베이스에 저장

    요청 예시:
    {
        "predicted_class": "캔",
        "actual_class": "플라스틱",
        "confidence": 0.86
    }
    """
    try:
        with get_db() as client:
            # 피드백 저장
            client.execute("""
                INSERT INTO feedback (predicted_class, actual_class, confidence, timestamp)
                VALUES (?, ?, ?, ?)
            """, [
                data.predicted_class,
                data.actual_class,
                data.confidence,
                datetime.now().isoformat()
            ])

            feedback_id = client.lastrowid

            return {
                "status": "success",
                "message": "피드백이 저장되었습니다.",
                "feedback_id": feedback_id
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"피드백 저장 오류: {str(e)}")

# 오답률 통계 조회
@router.get("/api/feedback/stats")
async def get_feedback_stats():
    """
    각 클래스별 오답률 통계 조회

    응답 예시:
    {
        "total_feedback": 50,
        "misclassification_rate": {
            "캔": {"total": 10, "errors": 3, "error_rate": 30.0},
            ...
        }
    }
    """
    try:
        with get_db() as client:
            # 전체 피드백 수
            client.execute("SELECT COUNT(*) FROM feedback")
            total_feedback = int(client.fetchone()[0])

            # 클래스별 오분류 통계
            client.execute("""
                SELECT predicted_class, COUNT(*) as count
                FROM feedback
                GROUP BY predicted_class
            """)

            misclassification_data = {}
            categories = ["캔", "유리", "종이", "플라스틱", "스티로폼", "비닐"]

            for category in categories:
                misclassification_data[category] = {
                    "total": 0,
                    "errors": 0,
                    "error_rate": 0.0
                }

            # 오분류 카운트
            for row in client.fetchall():
                predicted = row[0]
                error_count = int(row[1])
                if predicted in misclassification_data:
                    misclassification_data[predicted]["errors"] = error_count

            # 각 클래스의 전체 예측 수 (detected_items에서)
            client.execute("""
                SELECT category, COUNT(*) as count
                FROM detected_items
                GROUP BY category
            """)

            for row in client.fetchall():
                category = row[0]
                total_count = int(row[1])
                if category in misclassification_data:
                    misclassification_data[category]["total"] = total_count

                    # 오답률 계산
                    if total_count > 0:
                        error_rate = (misclassification_data[category]["errors"] / total_count) * 100
                        misclassification_data[category]["error_rate"] = round(error_rate, 1)

            return {
                "total_feedback": total_feedback,
                "misclassification_rate": misclassification_data
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"피드백 통계 조회 오류: {str(e)}")
