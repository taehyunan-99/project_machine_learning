from fastapi import APIRouter, UploadFile, File
from uuid import uuid4
import os, shutil, sys

# 파이프라인 import를 위한 경로 설정
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "training")))
from pipeline import YOLOResNetPipeline

router = APIRouter(tags=["predict"])

# 업로드된 이미지를 저장할 디렉토리 경로 설정
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 파이프라인 전역 변수 (서버 시작 시 한 번만 로드)
pipeline = YOLOResNetPipeline()

# 재활용품 이미지 분류 API
@router.post("/predict")
def predict(file: UploadFile = File(...)):
    print(f"\n{'='*50}")
    print(f"[새 요청] 파일명: {file.filename}")

    # 파일 확장자 추출 및 고유 파일명 생성
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    fname = f"{uuid4().hex}{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)

    # 업로드된 파일을 디스크에 저장
    print(f"[저장] 저장 경로: {fpath}")
    with open(fpath, "wb") as out:
        shutil.copyfileobj(file.file, out)
    print(f"[저장 완료] 파일 크기: {os.path.getsize(fpath)} bytes")

    # 파이프라인 실행: YOLO 객체 탐지 + ResNet 분류
    print(f"[객체 탐지] AI 모델 실행 시작...")
    detected_objects = pipeline.process_object(fpath)
    print(f"[탐지 결과] {len(detected_objects)}개 객체 탐지됨")

    # API 응답 포맷 생성
    api_response = pipeline.format_recycling_response(detected_objects, fname)
    print(f"[분류 완료] 분류 성공: {api_response['classified_items']}개, 실패: {api_response['unclassified_items']}개")
    print(f"[요약] {api_response['summary']}")
    print(f"{'='*50}\n")

    # 파이프라인 응답 그대로 반환
    return api_response