# YOLO 파인 튜닝

import os
import shutil
from pathlib import Path

# 클래스 매핑 (알파벳 순서)
class_mapping = {
    'can': 0,
    'glass': 1,
    'paper': 2,
    'plastic': 3,
    'styrofoam': 4,
    'vinyl': 5
}

# YOLO형식으로 폴더 구조 변환
def prepare_yolo_dataset(source_dir="datasets", output_dir="yolo_dataset"):
    # 긱 폴더를 순회
    for folder in ["train", "valid", "test"]:
        # 이미지 / 라벨 폴더 생성
        img_path = os.path.join(source_dir, output_dir, "images", folder)
        label_path = os.path.join(source_dir, output_dir, "labels", folder)
        os.makedirs(img_path, exist_ok=True)
        os.makedirs(label_path, exist_ok=True)

        # 클래스별 이미지 처리
        for class_name in class_mapping.keys():
            # 각 클래스 이미지 폴더에 접근
            source_class_dir = os.path.join(source_dir, "resnet", folder, class_name)
            # 이미지 파일 찾기
            for img_file in Path(source_class_dir).glob("*.jpg"):
                # 새 파일명 생성
                new_name = f"{class_name}_{img_file.name}"
                # 복사할 전체 경로 지정
                dst_img = os.path.join(img_path, new_name)
                # 이미지 복사
                shutil.copy(img_file, dst_img)
                # 라벨 파일명 생성
                label_name = new_name.replace(".jpg", ".txt")
                # 라벨 파일 전체 경로 지정
                dst_label = os.path.join(label_path, label_name)
                # 라벨 내용 작성
                class_id = class_mapping[class_name]
                with open(dst_label, "w") as f:
                    f.write(f"{class_id} 0.5 0.5 1.0 1.0\n")