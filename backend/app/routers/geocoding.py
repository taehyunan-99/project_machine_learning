# 역지오코딩 API 라우터
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

router = APIRouter(tags=["geocoding"])

# 환경 변수에서 네이버 API 키 가져오기
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

# 요청 모델
class ReverseGeocodeRequest(BaseModel):
    lat: float
    lng: float

# 역지오코딩 API
@router.post("/api/geocode/reverse")
async def reverse_geocode(data: ReverseGeocodeRequest):
    """
    네이버 역지오코딩 API를 프록시하여 좌표를 주소로 변환

    요청 예시:
    {
        "lat": 37.5665,
        "lng": 126.9780
    }

    응답 예시:
    {
        "address": "서울특별시 중구 태평로1가",
        "gu": "중구",
        "dong": "태평로1가"
    }
    """
    try:
        # 네이버 역지오코딩 API 호출
        url = f"https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords={data.lng},{data.lat}&output=json&orders=addr"

        headers = {
            "x-ncp-apigw-api-key-id": NAVER_CLIENT_ID,
            "x-ncp-apigw-api-key": NAVER_CLIENT_SECRET
        }

        print(f"[DEBUG] 네이버 API 호출: {url}")
        print(f"[DEBUG] 헤더: {headers}")

        response = requests.get(url, headers=headers, timeout=10)

        print(f"[DEBUG] 응답 상태: {response.status_code}")
        print(f"[DEBUG] 응답 내용: {response.text}")

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"네이버 API 오류: {response.text}")

        result = response.json()

        if result.get("results") and len(result["results"]) > 0:
            region = result["results"][0]["region"]

            return {
                "address": f"{region['area1']['name']} {region['area2']['name']} {region['area3']['name']}",
                "gu": region["area2"]["name"],
                "dong": region["area3"]["name"]
            }

        raise HTTPException(status_code=404, detail="주소를 찾을 수 없습니다.")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"API 호출 오류: {str(e)}")
