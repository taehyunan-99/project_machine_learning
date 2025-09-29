# YOLO + ResNet Model 파이프라인

from model import model, transform
from yolo_detector import YOLODetector
import cv2 as cv
import torch
from PIL import Image

class YOLOResNetPipeline:
    # 재활용 분류 매핑 (알파벳 순서: Can, Glass, Paper, Plastic, Styrofoam, Vinyl)
    recycling_classes = {
        0: {"category": "캔", "item_type": "캔류", "method": "내용물 비우고 캔 전용 수거함"}, # Can
        1: {"category": "유리", "item_type": "유리병", "method": "뚜껑 분리하고 유리 전용 수거함"}, # Glass
        2: {"category": "종이", "item_type": "종이류", "method": "테이프 제거하고 종이 전용 수거함"}, # Paper
        3: {"category": "플라스틱", "item_type": "플라스틱", "method": "라벨 제거하고 플라스틱 전용 수거함"}, # Plastic
        4: {"category": "스티로폼", "item_type": "스티로폼", "method": "이물질 제거하고 스티로폼 전용 수거함"}, # Styrofoam
        5: {"category": "비닐", "item_type": "비닐류", "method": "이물질 제거하고 비닐 전용 수거함"} # Vinyl
    }

    # 파이프라인 초기화
    def __init__(self):
        # YOLO 초기화
        self.yolo = YOLODetector()
        # ResNet 모델 초기화
        self.resnet = model
        self.transform = transform

    # 객체 처리 함수
    def process_object(self, img_path):
        print(f"이미지 처리 시작: {img_path}")

        # 원본 이미지 로드 및 확인
        original_image = cv.imread(img_path)
        if original_image is None:
            print("이미지를 로드할 수 없습니다!")
            return []
        
        # YOLO 객체 검출
        yolo_results = self.yolo.detect_objects(img_path)
        print(f"YOLO 검출 완료: {len(yolo_results)}개 객체")

        # 객체 부분만 자르기
        for idx, box in enumerate(yolo_results):
            print(f"\n객체 {idx+1} / {len(yolo_results)} 처리 중...")
            # 좌표 추출
            x1, y1, x2, y2 = box["bbox"]
            # 이미지 자르기
            cropped_img = original_image[y1:y2, x1:x2]
            # 저장해서 확인
            # cv.imwrite("crop_test_image.jpg", cropped_img)

            # BGR -> RGB 변환
            cropped_rgb = cv.cvtColor(cropped_img, cv.COLOR_BGR2RGB)
            # PIL 포맷으로 변환
            pil_img = Image.fromarray(cropped_rgb)
            # transform 적용 (tensor로 변환)
            input_tensor = self.transform(pil_img)
            # 배치 차원 추가
            input_batch = input_tensor.unsqueeze(0)
            # 디바이스로 이동
            device = next(self.resnet.parameters()).device
            input_batch = input_batch.to(device)

            # 모델 추론
            self.resnet.eval() # 평가 모드

            with torch.no_grad():
                outputs = self.resnet(input_batch)
                # 확률로 변환
                prob = torch.nn.functional.softmax(outputs[0], dim=0)
                # 가장 높은 확률의 클래스
                predicted_class = torch.argmax(outputs[0]).item()
                # 그 클래스의 신뢰도
                confidence = prob[predicted_class].item()

                # 결과 출력
                print(f"ResNet18 분류: 클래스 {predicted_class}, 신뢰도 {confidence:.3f}")

                # YOLO결과 + ResNet18 결과
                box["resnet_class"] = predicted_class
                box["resnet_confidence"] = confidence

        return yolo_results
    
    # API용 정보 응답 함수
    def format_recycling_response(self, yolo_results, img_path=""):
        recycling_items = []
        for idx, object in enumerate(yolo_results):
            # ResNet 분류 결과가 있는 경우에만 처리
            if "resnet_class" in object:
                recycling_info = self.recycling_classes.get(object["resnet_class"])
                item = {
                    "item_id": idx + 1,
                    "location": {
                        "bbox": object["bbox"],
                        "confidence": object["confidence"]
                    },
                    "recycling_info": {
                        "category": recycling_info["category"],
                        "item_type": recycling_info["item_type"],
                        "recycling_method": recycling_info["method"],
                        "confidence": object["confidence"]
                    }
                }
                recycling_items.append(item)
        return {
            "status": "success",
            "total_items": len(recycling_items),
            "recycling_items": recycling_items,
            "summary": f"총 {len(recycling_items)}개의 재활용품이 발견되었습니다!👀"
        }
    
# 테스트 실행
if __name__ == "__main__":
    pipeline = YOLOResNetPipeline()
    results = pipeline.process_object("datasets/p6.jpg")
    print(f"\n최종 결과: {len(results)}개 객체 검출됨")