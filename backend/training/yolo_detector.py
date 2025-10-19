# YOLO 구현

from ultralytics import YOLO
import os

# 모델 로딩을 한번만 하기 위해 클래스로 구현
class YOLODetector:
    # YOLO 초기화
    def __init__(self, model_path=None):
        if model_path is None:
            model_path = os.path.join(os.path.dirname(__file__), "yolo11m.pt")
        self.model = YOLO(model_path)
    
    # 재활용품 관련 클래스 ID
    RECYCLABLE_CLASSES = {
        39,  # bottle
        41,  # cup
        42,  # fork
        43,  # knife
        44,  # spoon
        45,  # bowl
        68,  # microwave
        69,  # oven
        70,  # toaster
        71,  # sink
        72,  # refrigerator
        73,  # book
        74,  # clock
        75,  # vase
        76,  # scissors
        77,  # teddy bear
        78,  # hair drier
        79,  # toothbrush
        # 필요시 추가 가능
    }

    # 객체 탐지 함수
    def detect_objects(self, img_path, filter_recyclables=True, imgsz=1280, conf=0.15):
        # 이미지 로드 (모델 적용 시 리스트 자동 생성)
        yolo_results = self.model(
            img_path,
            conf=conf, # 신뢰도 임계값 (기본 0.15, 실시간은 0.3)
            iou=0.5, # 겹치는 박스중 하나만 선택
            imgsz=imgsz # 입력 이미지 해상도 (기본 1280, 실시간은 640)
        )
        # 이미지 리스트에서 0번 이미지 로드
        detection = yolo_results[0]
        # 객체 정보를 저장할 리스트 생성
        detected_objects = []

        # 구조 확인
        print(f"타입 확인 : {type(yolo_results)}")
        print(f"결과 개수 : {len(yolo_results)}")

        # 검출된 객체 확인
        if detection.boxes is None:
            print("검출된 객체가 없습니다")
            return detected_objects
        print(f"검출된 객체 수: {len(detection.boxes)}")

        # 각 검출된 객체에 대해 정보 추출
        for box in detection.boxes:
            # 좌표 추출
            coords = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = coords
            # 정확도/신뢰도
            confidence = box.conf[0].cpu().numpy()
            # 객체의 클래스 정보
            class_id = int(box.cls[0].cpu().numpy())

            # 재활용품 필터링
            if filter_recyclables and class_id not in self.RECYCLABLE_CLASSES:
                print(f"무시: {detection.names[class_id]} (재활용품 아님)")
                continue

            # 객체 정보를 딕셔너리로 저장
            object_info = {
                "bbox" : [int(x1), int(y1), int(x2), int(y2)],
                "confidence" : float(confidence),
                "class_id" : class_id
            }
            # 객체 정보를 리스트에 저장
            detected_objects.append(object_info)

            # 결과 확인용 출력
            class_name = detection.names[class_id]
            print(f"검출 : {class_name}, 신뢰도 : {confidence:.2f}")

        return detected_objects

# YOLO 실행
# import시 실행 방지
if __name__ == "__main__":
    # 1. 검출기 생성
    detector = YOLODetector()

    # 2. 이미지 검출 실행
    # img = "datasets/yolo_test/p6.jpg"
    # results = detector.detect_objects(img)

    # # 3. 결과 출력
    # print(f"\n=== 최종 결과 ===")
    # print(f"총 {len(results)}개 객체 검출")

    # for i, obj in enumerate(results):
    #     print(f"객체{i+1} : {obj}")