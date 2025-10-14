# backend/app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import health, predict, stats, feedback
from .database import init_db

app = FastAPI(title="Recycle Lens API", version="0.1.0")

# 데이터베이스 초기화
init_db()

# CORS 설정
# 개발 환경: localhost 허용
# 프로덕션 환경: Vercel 도메인 추가 (배포 후 업데이트 필요)
import os

allowed_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    # Vercel 배포 후 여기에 실제 도메인 추가
    # "https://your-app.vercel.app",
]

# 개발 환경에서는 모든 origin 허용
if os.getenv("ENV", "development") == "development":
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(stats.router)
app.include_router(feedback.router)