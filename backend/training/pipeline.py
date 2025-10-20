# YOLO + ResNet Model 파이프라인

from training.model import test_transform
from training.yolo_detector import YOLODetector
import cv2 as cv
import torch
import torchvision.models as models
import torch.nn as nn
from PIL import Image
import os

# 학습이 완료된 모델 가져오기
model_path = os.path.join(os.path.dirname(__file__), "../models/model_v4.pth")
def load_trained_model(model_path=model_path):
    # 모델 구조 (7클래스)
    model = models.resnet18(weights=None)  # pretrained=False → weights=None
    model.fc = nn.Linear(512, 7)  # 6 → 7
    # 학습시킨 가중치 업데이트
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval() # 검증 모드
    # 디바이스 설정
    if torch.cuda.is_available():
        device = torch.device("cuda")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")
    # 모델을 디바이스로 이동
    model = model.to(device)
    return model

class YOLOResNetPipeline:
    # 재활용 분류 매핑 (7클래스)
    recycling_classes = {
        0: {"category": "캔", "item_type": "캔류", "method": """<b>✅ 배출 방법</b><br/><br/>

1. 내용물을 완전히 비우고 물로 헹구기<br/>
2. 겉면의 종이 라벨이나 비닐 스티커 제거<br/>
3. 가능하면 납작하게 찌그러뜨려 부피 줄이기<br/>
4. 플라스틱 뚜껑은 분리해서 플라스틱류로 배출<br/>
5. 캔 전용 수거함 또는 재활용품 수거함에 배출<br/><br/>

<b>⚠️ 주의사항</b><br/><br/>
• 부탄가스·스프레이는 반드시 내용물을 완전히 방출한 후 배출 (폭발 위험)<br/>
• 페인트통·오일통은 재활용 불가 (유해물질 포함)"""}, # Can

        1: {"category": "유리", "item_type": "유리병", "method": """<b>✅ 배출 방법</b><br/><br/>

1. 내용물을 완전히 비우고 물로 깨끗이 헹구기<br/>
2. 금속 또는 플라스틱 뚜껑 분리 (재질별로 따로 배출)<br/>
3. 라벨은 가능하면 제거<br/>
4. 유리병 전용 수거함에 배출<br/><br/>

<b>🔄 보증금 병 (소주병·맥주병)</b><br/><br/>
• 편의점·마트·슈퍼에 반납하면 보증금 환급!<br/>
• 재사용이 가장 친환경적인 방법입니다<br/><br/>

<b>⚠️ 주의사항</b><br/><br/>
• 깨진 유리는 신문지 등에 잘 싸서 종량제 봉투에 넣어서 배출<br/>
• 거울·판유리·식기·도자기는 재활용 불가<br/>
• 전구·형광등은 별도 수거함에 배출 (주민센터 문의)"""}, # Glass

        2: {"category": "종이", "item_type": "종이류", "method": """<b>✅ 배출 방법</b><br/><br/>

1. 테이프·철심·스프링 등 이물질 완전히 제거<br/>
2. 비닐 코팅 부분이 있으면 떼어내기<br/>
3. 끈으로 묶거나 박스에 담아서 배출<br/>
4. 비 오는 날은 피해서 배출 (젖으면 재활용 불가)<br/><br/>

<b>🥛 종이팩 (우유팩·주스팩)</b><br/><br/>
• 물로 헹구고 가위로 펼치기<br/>
• 바짝 말린 후 종이팩 전용 수거함에 배출<br/>
• ⚠️ 일반 종이와 절대 혼합 금지!<br/><br/>

<b>❌ 재활용 불가 (일반쓰레기)</b><br/><br/>
• 비닐 코팅된 종이 (광고지·잡지 표지)<br/>
• 물이나 음식물에 젖은 종이<br/>
• 기름때가 묻은 종이 (피자박스 기름 부분)<br/>
• 영수증·택배 송장 (감열지)<br/>
• 벽지·부직포"""}, # Paper

        3: {"category": "플라스틱", "item_type": "플라스틱", "method": """<b>✅ 배출 방법</b><br/><br/>

1. 내용물을 완전히 비우고 물로 깨끗이 헹구기<br/>
2. 라벨·스티커 완전히 제거<br/>
3. 뚜껑, 펌프, 손잡이 등 다른 재질 분리<br/>
4. 플라스틱 전용 수거함에 배출<br/><br/>

<b>⚠️ 투명 페트병 주의</b><br/><br/>
• 무색 투명한 페트병(생수병·음료수병)은 투명 페트병 전용 수거함에 따로 배출<br/>
• 전용 수거함이 없으면 일반 플라스틱 수거함에 배출<br/><br/>

<b>❌ 재활용 불가 (일반쓰레기)</b><br/><br/>
• PVC, 실리콘, 고무, 합성가죽<br/>
• 칫솔, 볼펜, 장난감 (작고 복합 재질)<br/>
• 전화기, 키보드 (전자부품 포함)<br/>
• 옷걸이 (철심 포함)<br/>
• 심하게 오염되어 세척 불가능한 용기"""}, # Plastic_opaque

        4: {"category": "플라스틱", "item_type": "플라스틱", "method": """<b>✅ 배출 방법</b><br/><br/>

1. 내용물을 완전히 비우고 물로 깨끗이 헹구기<br/>
2. 라벨·스티커 완전히 제거<br/>
3. 뚜껑, 펌프, 손잡이 등 다른 재질 분리<br/>
4. 플라스틱 전용 수거함에 배출<br/><br/>

<b>⚠️ 투명 페트병 주의</b><br/><br/>
• 무색 투명한 페트병(생수병·음료수병)은 투명 페트병 전용 수거함에 따로 배출<br/>
• 전용 수거함이 없으면 일반 플라스틱 수거함에 배출<br/><br/>

<b>❌ 재활용 불가 (일반쓰레기)</b><br/><br/>
• PVC, 실리콘, 고무, 합성가죽<br/>
• 칫솔, 볼펜, 장난감 (작고 복합 재질)<br/>
• 전화기, 키보드 (전자부품 포함)<br/>
• 옷걸이 (철심 포함)<br/>
• 심하게 오염되어 세척 불가능한 용기"""}, # Plastic_pet

        5: {"category": "스티로폼", "item_type": "스티로폼", "method": """<b>✅ 배출 방법</b><br/><br/>

1. 테이프·스티커·라벨 완전히 제거<br/>
2. 이물질을 완전히 제거하고 깨끗하게 세척<br/>
3. 스티로폼 전용 수거함 또는 재활용품 수거함에 배출<br/><br/>

<b>⚠️ 주의사항</b><br/><br/>
• 깨끗한 흰색 스티로폼만 재활용 가능<br/><br/>

<b>❌ 재활용 불가 (일반쓰레기)</b><br/><br/>
• 음식물이 묻은 스티로폼 (치킨·생선 받침)<br/>
• 색깔 스티로폼 (파란색·분홍색 등)<br/>
• 완충재 및 과일 포장재<br/>
• 코팅·접착제가 많은 것"""}, # Styrofoam

        6: {"category": "비닐", "item_type": "비닐류", "method": """<b>✅ 배출 방법</b><br/><br/>

1. 음식물, 기름기 등 이물질을 간단히 제거<br/>
2. 비닐 종류나 색상에 상관없이 모두 분리 배출 가능<br/>
3. 투명 비닐 봉투에 담아 배출<br/>
4. 접거나 딱지를 만들지 않고 펼쳐서 배출<br/><br/>

<b>❌ 재활용 불가 (일반쓰레기/종량제 봉투)</b><br/><br/>
• 랩<br/>
• 노끈<br/>
• 비닐 코팅된 종이<br/>
• 기타 재활용이 어려운 품목"""} # Vinyl
    }

    # 파이프라인 초기화
    def __init__(self):
        # YOLO 초기화
        yolo_model_path = os.path.join(os.path.dirname(__file__), "../models/yolo11s.pt")
        self.yolo = YOLODetector(model_path=yolo_model_path)
        # ResNet 모델 초기화
        self.resnet = load_trained_model()
        self.transform = test_transform

    # 객체 처리 함수
    def process_object(self, img_path, fast_mode=False):
        print(f"이미지 처리 시작: {img_path} (고속모드: {fast_mode})")

        # 원본 이미지 로드 및 확인
        original_image = cv.imread(img_path)
        if original_image is None:
            print("이미지를 로드할 수 없습니다!")
            return []

        # YOLO 객체 검출 (필터링 비활성화하여 모든 객체 탐지)
        # 실시간 모드: imgsz=640, conf=0.3 (빠르고 확실한 객체만)
        # 일반 업로드: imgsz=1280, conf=0.15 (고품질, 더 많은 객체)
        imgsz = 640 if fast_mode else 1280
        conf = 0.3 if fast_mode else 0.15
        yolo_results = self.yolo.detect_objects(img_path, filter_recyclables=False, imgsz=imgsz, conf=conf)
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
                class_name = self.recycling_classes[predicted_class]["category"]
                print(f"ResNet18 분류: {class_name} (클래스 {predicted_class}), 신뢰도 {confidence:.3f}")

                # YOLO결과 + ResNet18 결과
                box["resnet_class"] = predicted_class
                box["resnet_confidence"] = confidence

        return yolo_results
    
    # API용 정보 응답 함수
    def format_recycling_response(self, yolo_results, img_path=""):
        # ResNet 분류 결과를 담을 리스트 생성
        recycling_items = []
        # 분류에 실패한 객체를 담을 리스트(피드백 및 DB용)
        unclassified_items = []
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
                        "confidence": object["resnet_confidence"]
                    }
                }
                recycling_items.append(item)
            # 분류 실패시 피드백 요청
            else:
                unclassified_item = {
                    "item_id": idx + 1,
                    "location": {
                        "bbox": object["bbox"],
                        "confidence": object["confidence"]
                    },
                    "status": "classification_failed",
                    "feedback_request": {
                        "message": "이 객체의 재활용 분류를 도와주세요!",
                        "options": ["캔", "유리", "종이", "플라스틱", "스티로폼", "비닐"]
                    }
                }
                unclassified_items.append(unclassified_item)

        # API 응답 구성
        response = {
            "status": "success",
            "total_items": len(recycling_items) + len(unclassified_items),
            "classified_items": len(recycling_items),
            "unclassified_items": len(unclassified_items),
            "recycling_items": recycling_items
        }
        if unclassified_items:
            response["feedback_needed"] = unclassified_items
            response["summary"] = f"총 {len(recycling_items)}개 분류 완료, {len(unclassified_items)}개 항목의 사용자 피드백 필요"
        else:
            response["summary"] = f"총 {len(recycling_items)}개의 재활용품이 모두 분류되었습니다!"
        return response

# =============테스트 실행=============
# if __name__ == "__main__":
#     pipeline = YOLOResNetPipeline()
#     # 테스트할 이미지 파일들 (외장하드)
#     test_images = [
#         "D:/ml_data/pipe_test/test1.jpg",
#         "D:/ml_data/pipe_test/test2.jpg",
#         "D:/ml_data/pipe_test/test3.jpg",
#         "D:/ml_data/pipe_test/test4.jpg",
#         "D:/ml_data/pipe_test/test5.jpg"
#     ]
#     print("YOLO + ResNet 파이프라인 종합 테스트 시작")

#     for idx, img_path in enumerate(test_images):
#         print(f"\n테스트 {idx+1}/5: {img_path}")
#         # 파이프라인 실행
#         results = pipeline.process_object(img_path)
#         # API 응답 생성
#         api_response = pipeline.format_recycling_response(results, img_path)
#         # 결과 요약 출력
#         print(f"\n결과 요약:")
#         print(f"   • YOLO 탐지: {len(results)}개 객체")
#         print(f"   • 분류 완료: {api_response["classified_items"]}개")
#         print(f"   • 미분류: {api_response["unclassified_items"]}개")
#         print(f"   • 요약: {api_response["summary"]}")
#         # 상세 분류 결과
#         if api_response["recycling_items"]:
#             print(f"\n분류 결과:")
#             for item in api_response["recycling_items"]:
#                 category = item["recycling_info"]["category"]
#                 confidence = item["recycling_info"]["confidence"]
#                 print(f"   • 객체 {item["item_id"]}: {category} (신뢰도: {confidence:.3f})")
#         print(f"{'='*70}\n")
        
#     print("\n전체 테스트 완료!")