# YOLO + ResNet Model 파이프라인

from model import model, transform
from yolo_detector import YOLODetector
import cv2 as cv
import torch
from PIL import Image

class YOLOResNetPipeline:
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
        # ==========테스트용으로 첫 객체만 처리==========
        if len(yolo_results) > 0:
            # 객체 가져오기
            first_box = yolo_results[0]
            # 좌표 추출
            x1, y1, x2, y2 = first_box["bbox"]
            # 이미지 자르기
            cropped_image = original_image[y1:y2, x1:x2]
            # 저장해서 확인
            cv.imwrite("crop_test_image.jpg", cropped_image)
        
        return yolo_results
    
# 테스트 실행
if __name__ == "__main__":
    pipeline = YOLOResNetPipeline()
    results = pipeline.process_object("datasets/yolo_test/p6.jpg")
    print(f"최종 결과: {len(results)}개 객체 검출됨")