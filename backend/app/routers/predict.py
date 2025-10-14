from fastapi import APIRouter, UploadFile, File
import os, tempfile
from training.pipeline import YOLOResNetPipeline

router = APIRouter(tags=["predict"])

# 파이프라인 전역 변수 (서버 시작 시 한 번만 로드)
pipeline = YOLOResNetPipeline()

# 재활용품 이미지 분류 API
@router.post("/predict")
def predict(file: UploadFile = File(...)): # FormData 키 이름 : file
    print(f"\n{'='*50}")
    print(f"[새 요청] 파일명: {file.filename}")

    # 임시 파일로 저장 (처리 후 자동 삭제)
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name
        print(f"[임시 저장] {tmp_path}")

    try:
        # 파이프라인 실행: YOLO 객체 탐지 + ResNet 분류
        print(f"[객체 탐지] AI 모델 실행 시작...")
        detected_objects = pipeline.process_object(tmp_path)
        print(f"[탐지 결과] {len(detected_objects)}개 객체 탐지됨")

        # API 응답 포맷 생성
        api_response = pipeline.format_recycling_response(detected_objects)
        print(f"[분류 완료] 분류 성공: {api_response['classified_items']}개, 실패: {api_response['unclassified_items']}개")
        print(f"[요약] {api_response['summary']}")
        print(f"{'='*50}\n")

        return api_response

    finally:
        # 임시 파일 삭제
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
            print(f"[임시 파일 삭제] {tmp_path}")