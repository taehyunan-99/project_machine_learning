# backend/app/ml/matcher_core.py
# -*- coding: utf-8 -*-
from pathlib import Path
from typing import Dict
import cv2, torch, torch.nn as nn, torch.nn.functional as F
import numpy as np
import torchvision
from torchvision import transforms
from PIL import Image

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

DEFAULT_GUIDES = {
    "plastic_bottle": "플라스틱류로 분리배출하세요. 라벨·뚜껑 분리 후 배출!",
    "paper": "종이류 분리배출. 코팅지/영수증은 제외하세요.",
    "can": "캔류로 분리배출. 내용물 비우고 헹군 뒤 배출!",
    "glass": "유리병은 병류. 뚜껑 분리, 이물질 제거 후 배출!",
    "styrofoam": "스티로폼은 재활용 가능 표시 확인 후 깨끗이 비우고 배출!",
    "vinyl": "비닐류 분리배출. 음식물 묻은 비닐은 일반쓰레기입니다.",
}

def available_device() -> str:
    if torch.backends.mps.is_available(): return "mps"
    if torch.cuda.is_available(): return "cuda"
    return "cpu"

def load_yolo(model_name: str = "yolo11n.pt"):
    if YOLO is None:
        raise RuntimeError("ultralytics 미설치: pip install ultralytics")
    for name in [model_name, "yolov8n.pt"]:
        try:
            return YOLO(name), name
        except Exception:
            continue
    raise RuntimeError("YOLO 가중치 로드 실패")

def _detect_schema(ref_dir: Path):
    # flat: ref/<cls>/*.jpg   split: ref/{train,valid,val,test}/<cls>/*.jpg
    if any((ref_dir/s).exists() for s in ["train","valid","val","test"]): return "split"
    return "flat"

def _class_dirs(ref_dir: Path):
    if _detect_schema(ref_dir) == "flat":
        return {d.name:[d] for d in sorted(p for p in ref_dir.iterdir() if p.is_dir())}
    buckets={}
    for s in ["train","valid","val","test"]:
        sp = ref_dir/s
        if sp.exists():
            for d in (p for p in sp.iterdir() if p.is_dir()):
                buckets.setdefault(d.name, []).append(d)
    return buckets

def _list_imgs(folder: Path):
    exts={".jpg",".jpeg",".png",".bmp",".webp"}
    return [p for p in folder.rglob("*") if p.suffix.lower() in exts]

def build_embedder(device: str):
    # torchvision 0.23 안전한 방식: transforms()를 그대로 사용
    weights = torchvision.models.ResNet50_Weights.IMAGENET1K_V2  # 또는 .DEFAULT
    base = torchvision.models.resnet50(weights=weights)
    model = nn.Sequential(*list(base.children())[:-1]).to(device).eval()
    preprocess = weights.transforms()  # Resize/Crop/ToTensor/Normalize 모두 포함
    return model, preprocess

@torch.no_grad()
def img_bgr_to_embed(img_bgr, model, prep, device):
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    t = prep(Image.fromarray(rgb)).unsqueeze(0).to(device)
    f = model(t).view(1,-1)
    return F.normalize(f, dim=1).cpu()

def build_reference_bank(ref_dir: Path, model, prep, device) -> Dict[str, torch.Tensor]:
    if not ref_dir.exists(): raise RuntimeError(f"참조 폴더 없음: {ref_dir}")
    cmap = _class_dirs(ref_dir)
    centroids={}
    for cls, dirs in cmap.items():
        feats=[]
        for d in dirs:
            for p in _list_imgs(d):
                img=cv2.imread(str(p))
                if img is None: continue
                feats.append(img_bgr_to_embed(img, model, prep, device))
        if feats:
            mat=torch.cat(feats,0); cen=F.normalize(mat.mean(0,keepdim=True),dim=1)
            centroids[cls]=cen
    if not centroids: raise RuntimeError("참조 임베딩 비어 있음")
    return centroids

def cosine_sim(a: torch.Tensor, b: torch.Tensor) -> float:
    return float((a @ b.t()).item())