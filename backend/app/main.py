# backend/app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import health, predict, stats, feedback, geocoding
from .database import init_db

app = FastAPI(title="Recycle Lens API", version="0.1.0")

# 데이터베이스 초기화
init_db()

# CORS 설정
import os

# 환경별 CORS 설정
if os.getenv("ENV") == "production":
    # 프로덕션: 모든 origin 허용
    allowed_origins = ["*"]
    allow_credentials = False  # * 사용 시 False 필수
else:
    # 개발 환경: 특정 도메인만 허용
    allowed_origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://project-machine-learning-msdt41gv5-taehyunans-projects.vercel.app",
        "https://project-machine-learning-eight.vercel.app",
    ]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(stats.router)
app.include_router(feedback.router)
app.include_router(geocoding.router)