# backend/app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import health, predict, stats
from .database import init_db

app = FastAPI(title="Recycle Lens API", version="0.1.0")

# 데이터베이스 초기화
init_db()

# CORS (기존 그대로)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(stats.router)