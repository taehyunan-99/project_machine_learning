# 데이터 폴더 정리

import os, shutil, glob

# 원본 폴더 경로 지정
source_path = "./path/"

# 클래스 이름 설정
def folder_split(source_path, class_name="class_name"):

    for folder in ["train", "valid", "test"]:
        # 원본 폴더 경로 지정
        source_split_path = os.path.join(source_path, folder)

        # 타겟 경로 설정 및 폴더 생성
        if os.path.exists(source_split_path):
            target_dir = os.path.join(source_path, class_name, folder)
            os.makedirs(target_dir, exist_ok=True)

            # 이미지 탐색
            images = glob.glob(os.path.join(source_split_path, "**", "*.jpg"), recursive=True)
            images += glob.glob(os.path.join(source_split_path, "**", "*.png"), recursive=True)

            # 이미지 복사
            for idx, img_path in enumerate(images):
                # 파일 확장자 추출
                file_ext = os.path.splitext(img_path)[1]
                # 새로운 파일명 생성
                new_filename = f"img_{idx:06d}{file_ext}"
                # 새로운 파일 경로 정리
                target_path = os.path.join(target_dir, new_filename)
                # 파일 복사
                shutil.copy2(img_path, target_path)
        else:
            print(f"{source_split_path} 폴더를 찾을 수 없습니다.")

    print("완료!")

# 파일 실행

# folder_split(source_path)

# 클래스별 하위폴더 제거 및 이름 재설정
def data_rename(data_source_path, class_name):
    print(f"\n{class_name} 클래스 처리 시작...")

    # 경로 존재 확인
    if os.path.exists(data_source_path):
        # 모든 하위폴더에서 이미지 수집
        images = glob.glob(os.path.join(data_source_path, "**", "*.jpg"), recursive=True)
        images += glob.glob(os.path.join(data_source_path, "**", "*.png"), recursive=True)
        images += glob.glob(os.path.join(data_source_path, "**", "*.jpeg"), recursive=True)

        print(f"총 {len(images)}개 이미지 발견")

        # 파일 복사 및 이름 변경
        for idx, img_path in enumerate(images):
            # 파일 확장자 추출
            file_ext = os.path.splitext(img_path)[1]
            # 새로운 파일명 생성 (클래스명 추가)
            new_filename = f"{class_name}_{idx:06d}{file_ext}"
            # 같은 폴더에 새로운 이름으로 저장
            target_path = os.path.join(data_source_path, new_filename)
            # 파일 복사
            shutil.copy2(img_path, target_path)

        print(f"{class_name} 클래스 처리 완료! {len(images)}개 파일 복사됨")
    else:
        print(f"오류: {data_source_path} 폴더를 찾을 수 없습니다.")

# 파일 실행
data_source_path = "/Volumes/TaeHyun SSD/ml_data/valid/vinyl"

# if __name__ == "__main__":
#     # 테스트 실행
#     data_rename(data_source_path, "vinyl")