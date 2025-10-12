# backend/app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import health, predict

app = FastAPI(title="Recycle Lens API", version="0.1.0")

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