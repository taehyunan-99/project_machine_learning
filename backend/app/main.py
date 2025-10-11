# backend/app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import health, predict, trash  # DB 관련 라우터 제거 (feedback, results)

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
app.include_router(trash.router)

# 정적 페이지 서빙: http://127.0.0.1:8000/static/index.html
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir), html=True), name="static")

# [비활성화] trash.py 실시간 웹캠은 사용하지 않으므로 startup 제거
# @app.on_event("startup")
# async def _startup():
#     trash.startup()