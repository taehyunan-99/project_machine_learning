# backend/app/routers/trash.py
# -*- coding: utf-8 -*-
import os, base64, time
from pathlib import Path
from typing import Dict
import cv2, numpy as np, torch, torch.nn.functional as F
from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import JSONResponse
from ..ml.matcher_core import (
    available_device, load_yolo, build_embedder, build_reference_bank,
    img_bgr_to_embed, cosine_sim, DEFAULT_GUIDES
)
try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

router = APIRouter()
# 환경설정
REF_DIR = Path(os.environ.get("TRASH_REF_DIR", "ref_images")).resolve()
DEFAULT_MODEL = os.environ.get("TRASH_MODEL", "yolo11n.pt")
YOLO_CONF = float(os.environ.get("TRASH_YOLO_CONF", "0.4"))
MATCH_TH = float(os.environ.get("TRASH_MATCH_THRESHOLD", "0.60"))
MIN_AREA = int(os.environ.get("TRASH_MIN_AREA", str(40*40)))

# 모델/리소스 전역
yolo_model=None; embedder=None; prep=None; centroids: Dict[str, torch.Tensor]={}
GUIDES=dict(DEFAULT_GUIDES)

def _decode_dataurl(data_url: str):
    # "data:image/jpeg;base64,...." 또는 순수 base64
    b64 = data_url.split(";base64,")[-1]
    nparr = np.frombuffer(base64.b64decode(b64), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def startup():
    global yolo_model, embedder, prep, centroids
    device = available_device()
    yolo_model, used = load_yolo(DEFAULT_MODEL)
    embedder, prep = build_embedder(device)
    centroids = build_reference_bank(REF_DIR, embedder, prep, device)
    print(f"[trash] device={device}, yolo={used}, classes={list(centroids.keys())}")

@router.post("/infer")
def infer(frame_b64: str = Form(...)):
    if yolo_model is None: startup()
    img = _decode_dataurl(frame_b64)
    if img is None: raise HTTPException(400, "이미지 없음")
    res = yolo_model.predict(source=img, conf=YOLO_CONF, verbose=False)[0]
    dets=[]
    for b in res.boxes:
        x1,y1,x2,y2 = map(int, b.xyxy[0].tolist())
        if (x2-x1)*(y2-y1) < MIN_AREA: continue
        crop = img[max(0,y1):max(0,y2), max(0,x1):max(0,x2)].copy()
        if crop.size==0: continue
        emb = img_bgr_to_embed(crop, embedder, prep, available_device())
        best_cls, best_sim = "unknown", -1.0
        for cls, cen in centroids.items():
            sim = cosine_sim(emb, cen)
            if sim > best_sim: best_sim, best_cls = sim, cls
        matched = best_sim >= MATCH_TH
        guide = GUIDES.get(best_cls, "") if matched else "참조 이미지와 유사도가 낮습니다."
        dets.append({
            "bbox":[x1,y1,x2,y2],
            "match_class": best_cls if matched else "unknown",
            "similarity": round(float(best_sim),3),
            "guide": guide,
        })
    return JSONResponse({"count": len(dets), "detections": dets})

@router.get("/guides")
def get_guides(): return GUIDES

@router.post("/guides")
def update_guides(data: Dict[str, str]):
    GUIDES.update(data); return {"updated": list(data.keys())}

@router.post("/reload_refs")
def reload_refs():
    startup()
    return {"classes": list(centroids.keys())}