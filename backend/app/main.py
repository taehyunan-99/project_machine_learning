from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from .routers import health, predict, feedback, results

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recycle Lens API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(feedback.router)
app.include_router(results.router)
