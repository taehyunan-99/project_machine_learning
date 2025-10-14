# 통계 API 라우터

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
import sys
import os

# 데이터베이스 모듈 import
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from database import get_db

router = APIRouter(tags=["stats"])

# 요청 모델
class DetectedItem(BaseModel):
    category: str
    confidence: float

class AnalysisRequest(BaseModel):
    classified_items: int
    recycling_items: List[dict]

# 분석 결과 저장
@router.post("/api/stats")
async def save_analysis(data: AnalysisRequest):
    """
    분석 결과를 데이터베이스에 저장

    요청 예시:
    {
        "classified_items": 2,
        "recycling_items": [
            {
                "recycling_info": {
                    "category": "캔",
                    "confidence": 0.86
                }
            }
        ]
    }
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # 분석 기록 저장
            cursor.execute("""
                INSERT INTO analysis_records (timestamp, total_items)
                VALUES (?, ?)
            """, (datetime.now().isoformat(), data.classified_items))

            analysis_id = cursor.lastrowid

            # 탐지된 항목들 저장
            for item in data.recycling_items:
                category = item["recycling_info"]["category"]
                confidence = item["recycling_info"]["confidence"]

                cursor.execute("""
                    INSERT INTO detected_items (analysis_id, category, confidence)
                    VALUES (?, ?, ?)
                """, (analysis_id, category, confidence))

            conn.commit()

            return {
                "status": "success",
                "message": "분석 결과가 저장되었습니다.",
                "analysis_id": analysis_id
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 저장 오류: {str(e)}")

# 전체 통계 조회
@router.get("/api/stats")
async def get_stats():
    """
    전체 사용자의 통합 통계 조회

    응답 예시:
    {
        "total_analyses": 150,
        "total_items": 300,
        "category_counts": {
            "캔": 50,
            "유리": 40,
            ...
        }
    }
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # 총 분석 횟수
            cursor.execute("SELECT COUNT(*) FROM analysis_records")
            total_analyses = cursor.fetchone()[0]

            # 총 탐지 항목 수
            cursor.execute("SELECT COUNT(*) FROM detected_items")
            total_items = cursor.fetchone()[0]

            # 카테고리별 개수
            cursor.execute("""
                SELECT category, COUNT(*) as count
                FROM detected_items
                GROUP BY category
            """)

            category_counts = {
                "캔": 0,
                "유리": 0,
                "종이": 0,
                "플라스틱": 0,
                "스티로폼": 0,
                "비닐": 0
            }

            for row in cursor.fetchall():
                category_counts[row[0]] = row[1]

            return {
                "total_analyses": total_analyses,
                "total_items": total_items,
                "category_counts": category_counts
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 오류: {str(e)}")

# 일별 통계 조회
@router.get("/api/stats/daily")
async def get_daily_stats(days: int = 7):
    """
    최근 N일간의 일별 통계 조회

    파라미터:
    - days: 조회할 일수 (기본 7일)
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # 일별 분석 횟수
            cursor.execute("""
                SELECT
                    DATE(created_at) as date,
                    COUNT(*) as analyses,
                    SUM(total_items) as items
                FROM analysis_records
                WHERE created_at >= DATE('now', '-' || ? || ' days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """, (days,))

            daily_data = []
            for row in cursor.fetchall():
                daily_data.append({
                    "date": row[0],
                    "analyses": row[1],
                    "items": row[2]
                })

            return {"daily_stats": daily_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"일별 통계 조회 오류: {str(e)}")
