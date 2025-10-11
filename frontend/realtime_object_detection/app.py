# 필요한 라이브러리 임포트
from flask import Flask, render_template, Response
import cv2 as cv
import numpy as np

# Flask 앱 초기화
app = Flask(__name__)

# ----------------- 모델 및 설정 로드 -----------------
# 모델 파일 경로
prototxt = "model/deploy.prototxt.txt"
model = "model/mobilenet_iter_73000.caffemodel.txt"

# 최소 신뢰도(정확도) 임계값 설정
conf_threshold = 0.6 

# MobileNet-SSD가 탐지할 수 있는 클래스 레이블
CLASSES = ["background", "aeroplane", "bicycle", "bird", "boat",
	"bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
	"dog", "horse", "motorbike", "person", "pottedplant", "sheep",
	"sofa", "train", "tvmonitor"]

# 각 클래스에 대해 랜덤 색상 부여
COLORS = np.random.uniform(0, 255, size=(len(CLASSES), 3))

# 모델 로드
print("[INFO] loading model...")
net = cv.dnn.readNetFromCaffe(prototxt, model)

# 웹캠 카메라 실행 (0번 카메라)
camera = cv.VideoCapture(0)
# ----------------------------------------------------


def generate_frames():
    """
    카메라 프레임을 지속적으로 읽어와 객체 탐지를 수행하고,
    결과를 스트리밍 가능한 형태로 반환하는 제너레이터 함수.
    """
    while True:
        # 카메라에서 프레임 읽기
        success, frame = camera.read()
        if not success:
            break
        else:
            # 프레임의 높이와 너비 가져오기
            (h, w) = frame.shape[:2]

            # 이미지를 blob 형태로 변환 (전처리)
            # 300x300으로 크기 조정 및 정규화
            blob = cv.dnn.blobFromImage(cv.resize(frame, (300, 300)), 0.007843, (300, 300), 127.5)

            # blob을 네트워크의 입력으로 설정
            net.setInput(blob)
            
            # 객체 탐지 수행 (순방향 전파)
            detections = net.forward()

            # 탐지된 객체들을 순회
            for i in np.arange(0, detections.shape[2]):
                # 탐지 결과의 신뢰도(정확도) 추출
                confidence = detections[0, 0, i, 2]

                # 신뢰도가 설정한 임계값보다 높은 경우에만 처리
                if confidence > conf_threshold:
                    # 클래스 레이블 인덱스 추출
                    idx = int(detections[0, 0, i, 1])
                    
                    # 객체 주위에 경계 상자(bounding box) 그리기
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    (startX, startY, endX, endY) = box.astype("int")

                    # 레이블과 신뢰도 텍스트 준비
                    label = f"{CLASSES[idx]}: {confidence*100:.2f}%"
                    
                    # 경계 상자와 텍스트를 프레임에 그리기
                    cv.rectangle(frame, (startX, startY), (endX, endY), COLORS[idx], 2)
                    y = startY - 15 if startY - 15 > 15 else startY + 15
                    cv.putText(frame, label, (startX, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLORS[idx], 2)

            # 프레임을 JPEG 형식으로 인코딩
            ret, buffer = cv.imencode('.jpg', frame)
            frame = buffer.tobytes()

            # yield 키워드를 사용하여 프레임을 스트리밍
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/')
def index():
    """웹사이트의 메인 페이지를 렌더링합니다."""
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    """비디오 스트리밍 경로. generate_frames 함수를 통해 실시간 영상을 전송합니다."""
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    # Flask 앱 실행 (디버그 모드 활성화)
    app.run(debug=True)