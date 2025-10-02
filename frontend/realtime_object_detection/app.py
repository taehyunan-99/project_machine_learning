# 필요한 라이브러리 임포트
import os
from flask import Flask, render_template, Response
import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.models as models
import torch.nn as nn
from torchvision import transforms
from ultralytics import YOLO

# --- 1. Flask 앱 및 기본 설정 ---
app = Flask(__name__)

# --- 2. 모델 로드 및 파이프라인 준비 ---
print("Initializing models and setting up the pipeline...")

# 사용 가능한 디바이스 설정 (CUDA, MPS, CPU 순으로 자동 선택)
if torch.cuda.is_available():
    device = torch.device("cuda")
    print("Using CUDA GPU")
elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using Apple MPS (Metal Performance Shaders)")
else:
    device = torch.device("cpu")
    print("Using CPU")

# ResNet 모델 구조 정의 및 로드 함수
def load_resnet_model(model_path):
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(512, 6)
    
    if not os.path.exists(model_path):
        print(f"FATAL ERROR: ResNet model weights not found at '{model_path}'")
        print("Please run 'python my_model.py' to train and generate the 'model_v1.pth' file.")
        return None
        
    try:
        model.load_state_dict(torch.load(model_path, map_location=device))
    except Exception as e:
        print(f"An error occurred while loading the ResNet model: {e}")
        return None
        
    model.to(device)
    model.eval()
    print("ResNet model loaded successfully.")
    return model

# YOLO 모델 로드 (ultralytics 라이브러리 사용)
yolo_detector = None
try:
    yolo_model_path = "models/yolo11m.pt"
    if not os.path.exists(yolo_model_path):
        print(f"FATAL ERROR: YOLO model not found at '{yolo_model_path}'")
    else:
        yolo_detector = YOLO(yolo_model_path)
        print("YOLO model loaded successfully.")
except Exception as e:
    print(f"An error occurred while loading the YOLO model: {e}")

# ResNet 모델 로드
resnet_model_path = "models/model_v1.pth"
resnet_model = load_resnet_model(resnet_model_path)

# 이미지 전처리를 위한 변환
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# 분류 결과 매핑
recycling_classes = {
    0: "Can", 1: "Glass", 2: "Paper", 3: "Plastic", 4: "Styrofoam", 5: "Vinyl"
}

# 웹캠 실행
camera = cv2.VideoCapture(0)

# --- 3. 비디오 스트리밍 및 추론 함수 ---
def generate_frames():
    if yolo_detector is None or resnet_model is None:
        error_message = "Model loading failed. Check terminal for details."
        while True:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, error_message, (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
    while True:
        success, frame = camera.read()
        if not success:
            break

        yolo_results = yolo_detector(frame, verbose=False)[0]

        if yolo_results.boxes is not None:
            for box in yolo_results.boxes:
                coords = box.xyxy[0].cpu().numpy().astype(int)
                x1, y1, x2, y2 = coords
                
                cropped_img = frame[y1:y2, x1:x2]
                
                if cropped_img.size == 0: continue
                cropped_rgb = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(cropped_rgb)
                input_tensor = transform(pil_img).unsqueeze(0).to(device)

                with torch.no_grad():
                    outputs = resnet_model(input_tensor)
                    prob = torch.nn.functional.softmax(outputs[0], dim=0)
                    predicted_class_id = torch.argmax(outputs[0]).item()
                    resnet_confidence = prob[predicted_class_id].item()

                label = recycling_classes.get(predicted_class_id, "Unknown")
                display_text = f"{label}: {resnet_confidence:.2f}"
                
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, display_text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# --- 4. Flask 라우팅 ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# --- 5. 앱 실행 ---
if __name__ == '__main__':
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    if not os.path.exists('templates/index.html'):
        with open('templates/index.html', 'w', encoding='utf-8') as f:
            f.write("""
            <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>실시간 재활용품 분류</title>
            <style>body{font-family:sans-serif;text-align:center;margin-top:50px;}img{border:2px solid #ccc;border-radius:8px;}</style>
            </head><body><h1>실시간 재활용품 분류 도우미</h1>
            <img src="{{ url_for('video_feed') }}" width="640" height="480"></body></html>
            """)
            
    if not os.path.exists('models'):
        os.makedirs('models')
        print("Warning: 'models' folder created. Please place model files in this folder.")

    app.run(debug=True)