# API 서버

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import torch
import torchvision.models as models
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import io
from contextlib import asynccontextmanager

model = None
transform = None
device = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 모델 로드
    global model, transform, device

    print("AI 모델 로딩 중...")

    # 디바이스 설정
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"사용 디바이스 : {device}")

    # 모델 구조 생성
    model = models.resnet18(pretrained=False)
    model.fc = nn.Linear(512, 1) # 테스트 = 이진 분류 모델

    # 모델 파일 로드
    try:
        model.load_state_dict(torch.load("test_model.pth", map_location=device))
        model = model.to(device)
        model.eval()
        print("AI 모델 로드 완료!")
    except Exception as e:
        print(f"모델 로드 실패 : {e}")
        return
    
    # 전처리 설정
    transform = transforms.Compose([
        transforms.Resize((224,224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    print("모델 준비 완료!")
    yield
    print("종료중")

app = FastAPI(title="Test API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 메인 페이지 접속
@app.get("/")
def root():
    return {"message": "Test 서버"}

# 서버 상태 진단
@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "model_loaded": model is not None    
    }

# 이미지 분류 ======== 테스트는 이진분류로 진행 ========
@app.post("/predict")
async def predict_test(file: UploadFile = File(...)):
    # 모델 확인 및 에러 처리
    if model is None or transform is None:
        print("모델이 None입니다!")
        return JSONResponse(content={"error": "AI 모델이 로드되지 않았습니다."}, status_code=500)
    
    # 이미지 전처리
    img_data = await file.read()
    img = Image.open(io.BytesIO(img_data))
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    # 텐서로 변환
    img_tensor = transform(img).unsqueeze(0).to(device)

    # AI 모델 실행
    with torch.no_grad():
        outputs = model(img_tensor)
        probability = torch.sigmoid(outputs.squeeze()).item()

    # 결과 해석
    is_plastic = probability > 0.5
    confidence  = probability if is_plastic else (1 - probability)

    # 결과 반환
    result = {
        "filename": file.filename,
        "label": "플라스틱" if is_plastic else "캔",
        "confidence": round(confidence * 100, 1),
        "disposal_method": "플라스틱 분리수거함에 배출하세요!" if is_plastic else "캔 분리수거함에 배출하세요!"
    }

    return result