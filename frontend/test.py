# server.py 예시

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import time # 시뮬레이션을 위해 추가

# --- 실제 YOLO 모델 로딩 및 예측 로직을 여기에 구현해야 합니다 ---
# 예: from models import YOLOModel
# yolo_model = YOLOModel('/path/to/your/yolo_model.pt')
# -----------------------------------------------------------------

app = Flask(__name__)
CORS(app) # CORS 설정: 프론트엔드와 백엔드 도메인이 다를 때 필요

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected image file'}), 400

    if file:
        try:
            # 이미지 파일을 Pillow로 열어서 처리 (YOLO 모델에 따라 다름)
            image_bytes = file.read()
            img = Image.open(io.BytesIO(image_bytes))

            # --- 이 부분에 실제 YOLO 모델 예측 로직이 들어갑니다 ---
            # 예: results = yolo_model.predict(img)
            #     predicted_label = results.label
            #     confidence = results.confidence

            # 현재는 YOLO 예측을 시뮬레이션
            time.sleep(1.5) # 분석 시간 시뮬레이션
            predicted_label = "페트병" # 임의의 예측 결과
            confidence = 0.95 # 임의의 정확도

            # 실제 YOLO 모델은 여러 객체를 감지할 수 있으므로,
            # 여기서는 가장 확률 높은 하나의 객체만 반환한다고 가정합니다.
            
            return jsonify({
                'label': predicted_label,
                'confidence': confidence,
                'timestamp': time.time()
            })

        except Exception as e:
            print(f"Error during prediction: {e}")
            return jsonify({'error': 'Prediction failed', 'details': str(e)}), 500

    return jsonify({'error': 'Unknown error'}), 500

if __name__ == '__main__':
    # Flask 서버 실행
    # debug=True는 개발용이며, 실제 서비스에서는 False로 설정해야 합니다.
    app.run(host='0.0.0.0', port=5000, debug=True)