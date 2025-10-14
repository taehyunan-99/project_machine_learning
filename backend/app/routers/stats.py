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
        with get_db() as client:
            # 분석 기록 저장
            client.execute("""
                INSERT INTO analysis_records (timestamp, total_items)
                VALUES (?, ?)
            """, [datetime.now().isoformat(), data.classified_items])

            analysis_id = client.lastrowid

            # 탐지된 항목들 저장
            for item in data.recycling_items:
                category = item["recycling_info"]["category"]
                confidence = item["recycling_info"]["confidence"]

                client.execute("""
                    INSERT INTO detected_items (analysis_id, category, confidence)
                    VALUES (?, ?, ?)
                """, [analysis_id, category, confidence])

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
        with get_db() as client:
            # 총 분석 횟수
            client.execute("SELECT COUNT(*) FROM analysis_records")
            total_analyses = int(client.fetchone()[0])

            # 총 탐지 항목 수
            client.execute("SELECT COUNT(*) FROM detected_items")
            total_items = int(client.fetchone()[0])

            # 평균 신뢰도 (정확도)
            client.execute("SELECT AVG(confidence) FROM detected_items")
            avg_confidence = client.fetchone()[0]
            avg_accuracy = round(float(avg_confidence) * 100, 1) if avg_confidence else 0

            # 카테고리별 개수
            client.execute("""
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

            for row in client.fetchall():
                category_counts[row[0]] = int(row[1])

            return {
                "total_analyses": total_analyses,
                "total_items": total_items,
                "avg_accuracy": avg_accuracy,
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

    응답:
    - days=1 or 7: 클래스별 통계
    - days=30: 전체 분석 횟수만
    """
    try:
        with get_db() as client:
            # days=1이면 오늘만, days>1이면 (days-1)일 전부터
            adjusted_days = 0 if days == 1 else days - 1

            if days == 30:
                # 한달: 전체 분석 횟수만
                client.execute("""
                    SELECT
                        DATE(created_at) as date,
                        COUNT(*) as analyses
                    FROM analysis_records
                    WHERE created_at >= DATE('now', '-' || ? || ' days')
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                """, [adjusted_days])

                daily_data = []
                for row in client.fetchall():
                    daily_data.append({
                        "date": row[0],
                        "total_analyses": int(row[1])
                    })
            else:
                # 하루/일주일: 클래스별 통계
                client.execute("""
                    SELECT
                        DATE(ar.created_at) as date,
                        di.category,
                        COUNT(di.id) as count
                    FROM analysis_records ar
                    JOIN detected_items di ON ar.id = di.analysis_id
                    WHERE ar.created_at >= DATE('now', '-' || ? || ' days')
                    GROUP BY DATE(ar.created_at), di.category
                    ORDER BY date DESC
                """, [adjusted_days])

                # 날짜별로 데이터 구조화
                daily_data_dict = {}
                for row in client.fetchall():
                    date = row[0]
                    category = row[1]
                    count = int(row[2])

                    if date not in daily_data_dict:
                        daily_data_dict[date] = {
                            "date": date,
                            "캔": 0,
                            "유리": 0,
                            "종이": 0,
                            "플라스틱": 0,
                            "스티로폼": 0,
                            "비닐": 0
                        }

                    daily_data_dict[date][category] = count

                # 리스트로 변환
                daily_data = list(daily_data_dict.values())

            return daily_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"일별 통계 조회 오류: {str(e)}")
