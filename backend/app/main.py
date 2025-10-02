# backend/app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, engine
from .routers import health, predict, feedback, results, trash  # ← trash 추가

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recycle Lens API", version="0.1.0")

# CORS (기존 그대로)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기존 라우터
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(feedback.router)
app.include_router(results.router)

# 새 라우터: /infer, /guides, /reload_refs
app.include_router(trash.router)

# 정적 페이지 서빙: http://127.0.0.1:8000/static/index.html
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir), html=True), name="static")

# 서버 시작 시 모델/참조 임베딩 로드(선택이지만 권장)
@app.on_event("startup")
async def _startup():
    trash.startup()