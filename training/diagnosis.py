# AI Model 진단

import os
import torch
from torchvision import datasets
from collections import Counter
import random
from model import transform
from pipeline import load_trained_model

# 클래스 매핑
class_name = {
    0: "캔",
    1: "유리",
    2: "종이",
    3: "플라스틱",
    4: "스티로폼",
    5: "비닐"
}

# 경로 지정
ssd_path = "/Volumes/TaeHyun SSD/ml_data/"
local_path = "datasets/resnet/"
win_path = "D:/ml_data/resnet/"  
folder_path = win_path

print("="*70)
print("모델 진단 스크립트 시작")
print("="*70)

# 데이터셋 분포 함수 
# train, valid, test 폴더의 클래스별 이미지 개수를 출력
def analyze_dataset():
    print("\n[1단계] 데이터셋 클래스별 분포 확인")
    print("="*70)

    # 데이터셋 경로 지정
    datasets_path = {
        "Train": os.path.join(folder_path, "train"),
        "Valid": os.path.join(folder_path, "valid"),
        "Test": os.path.join(folder_path, "test")
    }

    # 폴더 하나씩 확인
    for name, path in datasets_path.items():
        # 이미지와 라벨 로드
        dataset = datasets.ImageFolder(path)
        # 라벨 리스트에서 라벨별 개수 카운트
        class_counts = Counter(dataset.targets)
        # 출력
        print(f"{name} Dataset")
        total = 0
        for class_idx in sorted(class_counts.keys()):
            count = class_counts[class_idx]
            total += count
            print(f"{class_name[class_idx]}: {count}개")

        print(f"\n총 {total}개")
        print("="*70)

# 모델 예측 분포 확인
def test_model_predictions(sample_size=20):
    print("\n[2단계] 모델 예측 분포 테스트")
    print(f"각 클래스당 {sample_size}개 샘플 테스트")
    print("="*70)

    # 모델 로드
    model = load_trained_model()
    # 디바이스 이동
    device = next(model.parameters()).device
    print(f"디바이스 : {device}")

    # 테스트 데이터셋 불러오기
    test_dataset = datasets.ImageFolder(f"{folder_path}test", transform=transform)

    # 예측 결과를 저장할 딕셔너리 생성
    prediction_results = {}

    # 클래스별 분포 확인
    for true_class in range(6):
        print(f"\n실제 클래스: {class_name[true_class]}")
        # 해당 클래스의 인덱스 찾기
        class_indices = [idx for idx, label in enumerate(test_dataset.targets) if label == true_class]
        # 테스트용 샘플 가져오기
        sampled_indices = random.sample(class_indices, min(sample_size, len(class_indices)))
        # 현재 클래스의 결과 저장
        predictions = []
        # 이미지 처리
        for idx in sampled_indices:
            # 이미지만 가져오기
            img_tensor, _ = test_dataset[idx]
            # 배치 추가 및 디바이스 이동
            img_batch = img_tensor.unsqueeze(0).to(device)
            # 모델 적용
            with torch.no_grad():
                outputs = model(img_batch)
                predicted_class = torch.argmax(outputs[0]).item()
                predictions.append(predicted_class)
        # 결과 집계
        pred_counts = Counter(predictions)
        # 딕셔너리에 결과 저장
        prediction_results[true_class] = pred_counts

        # 출력
        print(f"예측 분포 :")
        for pred_class in sorted(pred_counts.keys()):
            count = pred_counts[pred_class]
            percentage = (count / len(predictions)) * 100
            print(f"    → {class_name[pred_class]}: {count}개 ({percentage:.1f}%)")
    
    print("="*70)
    return prediction_results

# 실행
if __name__ == "__main__":
    analyze_dataset()
    # test_model_predictions(sample_size=20)