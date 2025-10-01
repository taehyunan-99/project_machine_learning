# YOLO + ResNet18 다항분류 프로젝트 진행상황

## 프로젝트 개요
**목표**: YOLO 객체 탐지 + ResNet18 분류를 결합한 다항분류 모델 구축
- YOLO로 객체 위치 탐지 → ResNet18로 6가지 클래스 분류
- 단계별 학습 방식으로 진행 (이해하면서 구현)

## 필수 규칙
- 코드 작성은 사용자가 직접 작성(요청시에만 완성된 코드 출력)
- 각 단계별로 이 코드가 어떤 목적인지 어떻게 작동하는지 등을 설명해주면서 진행

## 완료된 작업 ✅

### 1. ResNet18 모델 수정 (model.py)
- **변경사항**: 이진분류 → 다항분류 (6클래스)
- **주요 수정내용**:
  - `num_classes = 6`
  - `model.fc = nn.Linear(512, num_classes)`
  - 손실함수: `BCEWithLogitsLoss` → `CrossEntropyLoss`
  - 학습/검증 루프 다항분류에 맞게 수정

### 2. YOLO 객체 탐지기 구현 (yolo_detector.py)
- **YOLODetector 클래스**: YOLO11n 모델 사용
- **detect_objects 메소드**:
  - 입력: 이미지 경로
  - 출력: `[{"bbox": [x1,y1,x2,y2], "confidence": float, "class_id": int}]`
- **주요 기능**: 객체 좌표, 신뢰도, 클래스ID 추출

### 3. 파이프라인 구현 (pipeline.py)
- **YOLOResNetPipeline 클래스**
- **3단계까지 완료**:
  1. ✅ 이미지 로딩 (`cv.imread`)
  2. ✅ YOLO 객체 탐지 (`yolo.detect_objects`)
  3. ✅ 이미지 크롭핑 (첫 번째 객체만 테스트용)

## 완료된 작업 ✅ (계속)

### 4. ResNet18 분류 기능 구현 (pipeline.py)
- **이미지 전처리**: OpenCV(BGR) → PIL(RGB) → PyTorch tensor 변환
- **GPU 호환성**: 입력 데이터를 모델과 동일한 디바이스로 이동
- **모델 추론**: `eval()` 모드 + `torch.no_grad()` 사용
- **결과 처리**: softmax → 확률 변환, argmax → 클래스 예측

### 5. 결과 통합 구현
- **YOLO+ResNet18**: 각 객체마다 `resnet_class`, `resnet_confidence` 추가
- **출력 형태**:
  ```python
  {
    "bbox": [x1,y1,x2,y2], "confidence": 0.87, "class_id": 0,
    "resnet_class": 5, "resnet_confidence": 0.433
  }
  ```

### 6. 다중 객체 처리 확장
- **구조 변경**: `if` → `for` 루프로 모든 객체 처리
- **변수명 통일**: `first_box` → `box` 일관성 유지
- **개별 처리**: 각 객체마다 크롭 → 분류 → 결과 통합

### 7. 재활용 분류 API 응답 구현
- **클래스 매핑**: 0-5 클래스를 실제 재활용 카테고리로 변환
  - 0: 캔, 1: 유리, 2: 종이, 3: 플라스틱, 4: 스티로폼, 5: 비닐
- **API 응답 함수**: `format_recycling_response()` 구현
- **사용자 친화적**: 분리수거 방법까지 포함한 상세 정보 제공

## 현재 상태 ✅ 2024.10.01 기준 완료

### 8. 사용자 피드백 시스템 구현 ✅
- **분류 실패 케이스 처리**: ResNet 분류 실패 시 사용자 피드백 요청 메시지 추가
- **API 응답 구조 확장**:
  - `classified_items`: 성공적으로 분류된 항목 개수
  - `unclassified_items`: 분류 실패한 항목 개수
  - `feedback_needed`: 피드백이 필요한 객체 정보
- **피드백 옵션**: ["캔", "유리", "종이", "플라스틱", "스티로폼", "비닐"] 6개 선택지 제공

### 9. 데이터 전처리 시스템 구축 ✅
- **파일명 중복 해결**: `folder_split.py`에 `data_rename()` 함수 구현
- **서브폴더 통합**: recursive 검색으로 모든 하위폴더 이미지 수집
- **클래스별 고유 파일명**: `glass_000001.jpg` 형태로 재명명
- **외장하드 활용**: `/Volumes/TaeHyun SSD/ml_data/` 경로에 대용량 데이터 관리

### 10. 프로토타입 모델 훈련 완료 ✅
- **데이터셋**: 6개 클래스별 800개(train) + 150개(valid) = 총 5,700장
- **모델**: ResNet18 사전훈련 모델 → 6개 클래스 fine-tuning
- **학습 환경**: Apple MPS (Metal Performance Shaders) 사용
- **학습 결과**: 5 epochs 완료, prototype_model_v1.pth 저장
- **초기 성능**: 1 epoch에서 68.2% 정확도 (Transfer Learning 효과)

### 11. 학습된 모델 통합 ✅
- **모델 로딩 함수**: `load_trained_model()` 구현
- **경로 관리**: `../backend/models/prototype_model_v1.pth`
- **디바이스 최적화**: CUDA/MPS/CPU 자동 선택
- **파이프라인 연동**: 사전훈련 모델 → 학습된 모델로 교체

### 12. 종합 테스트 시스템 구축 ✅
- **다중 이미지 테스트**: 5개 파일 순차 처리
- **전체 플로우 검증**: YOLO → ResNet → API 응답 전 과정
- **상세 결과 출력**: 탐지 개수, 분류 결과, 신뢰도, API 응답 구조
- **테스트 결과**: YOLO 객체 인식 문제 발견 (이미지 크기 이슈)

### 13. 파이프라인 경로 최적화 ✅
- **파일 경로 문제 해결**: 상대 경로 → 절대 경로 변환
- **yolo_detector.py**: `os.path.dirname(__file__)` 기반 경로 설정
- **pipeline.py**: 모델 파일 경로를 절대 경로로 수정
- **효과**: 어느 디렉토리에서 실행해도 정상 작동

### 14. FastAPI 서버 구축 및 파이프라인 통합 ✅ (2024.10.01)
- **프로젝트 구조**: 라우터 기반 모듈식 FastAPI 애플리케이션
- **파이프라인 통합**:
  - `backend/app/routers/predict.py`에서 파이프라인 import
  - `sys.path.append()`로 training 폴더 경로 추가
  - 전역 변수로 파이프라인 1회 로드 (성능 최적화)
- **주요 기능**:
  - 이미지 업로드 → 파일 저장 → YOLO+ResNet 처리 → 결과 반환
  - 모든 탐지된 객체의 분류 결과 반환 (다중 객체 지원)
  - 상세한 디버깅 로그 (print문으로 각 단계 출력)
- **DB 제거**: 프로토타입 단계에서 DB 사용하지 않고 즉시 응답 반환
- **API 응답 형식**:
  ```json
  {
    "status": "success",
    "total_items": 탐지된_객체_수,
    "classified_items": 분류_성공_수,
    "unclassified_items": 분류_실패_수,
    "recycling_items": [
      {
        "item_id": 1,
        "location": {"bbox": [...], "confidence": 0.xx},
        "recycling_info": {
          "category": "플라스틱",
          "item_type": "플라스틱",
          "recycling_method": "라벨 제거하고 플라스틱 전용 수거함",
          "confidence": 0.xx
        }
      }
    ],
    "summary": "..."
  }
  ```

### 15. API 서버 테스트 완료 ✅
- **테스트 환경**: Swagger UI (`http://localhost:8000/docs`)
- **테스트 결과**:
  - YOLO: cup 객체 탐지 (신뢰도 0.28)
  - ResNet: 플라스틱 분류 (신뢰도 1.0)
  - API 응답 정상 작동 확인
- **서버 실행**: `uvicorn app.main:app --reload`

## 현재 발견된 문제점 및 해결방안 🔧

### 1. YOLO 객체 인식 문제
- **문제**: 작은 이미지에서 객체 탐지 실패 (0개 객체 검출)
- **원인**: 이미지 해상도 부족, 객체 크기 문제
- **해결방안**:
  - 고해상도 이미지 사용 (최소 640x640)
  - 신뢰도 임계값 조정 (conf=0.1)
  - 이미지 크기 조정 (imgsz=1280)

### 2. 모델 파일 관리
- **문제**: .pth 파일 크기로 인한 Git 관리 이슈
- **해결방안**:
  - `.gitignore`에 `*.pth` 추가
  - 별도 클라우드 스토리지 활용
  - README에 모델 다운로드 방법 명시

## 다음 개발 단계 📋

### 즉시 작업 (당장)
1. **DB 완전 제거** (선택):
   - `app/db.py`, `app/models.py` 삭제
   - `app/main.py`에서 DB import 제거
   - `feedback.py`, `results.py` 라우터 제거 또는 유지 결정
2. **웹 프론트엔드 구축**:
   - 실시간 카메라 인터페이스 (스냅샷 방식 또는 연속 분석)
   - React 또는 HTML/JS 선택
   - 결과 시각화 (바운딩 박스 + 분류 결과)

### 단기 목표 (1-2주)
1. **YOLO 성능 개선**: 객체 탐지 정확도 향상
2. **모델 성능 평가**: 더 많은 테스트 데이터로 정확도 측정
3. **실시간 처리 최적화**: 응답 속도 개선 (현재 ~1초/프레임)

### 중기 목표 (1개월)
1. **웹 인터페이스 완성**: 카메라 기능 + 결과 표시 + 사용자 피드백
2. **모델 재학습**: 더 큰 데이터셋으로 성능 향상
3. **배포 환경 구축**: Docker 컨테이너화

### 장기 목표 (3개월)
1. **모바일 앱 연동**: 네이티브 앱 또는 PWA
2. **사용자 피드백 학습**: 피드백 데이터로 모델 지속 개선
3. **상용화 준비**: 실제 서비스 운영 환경 구축

## 파일 구조 (업데이트 2024.10.01)
```
project_machine_learning/
├── training/
│   ├── model.py              # ResNet18 다항분류 모델 (6클래스)
│   ├── yolo_detector.py      # YOLO 객체 탐지기 (절대 경로 적용)
│   ├── pipeline.py           # YOLO+ResNet 파이프라인 (학습된 모델 통합)
│   ├── folder_split.py       # 데이터 전처리 (파일명 중복 해결)
│   ├── datasets/
│   │   ├── train/           # 프로토타입 훈련 데이터 (800개씩)
│   │   ├── valid/           # 프로토타입 검증 데이터 (150개씩)
│   │   └── pipe_test/       # 파이프라인 테스트 이미지들
│   ├── yolo11n.pt          # YOLO 사전훈련 모델
│   └── PROJECT_STATUS.md    # 프로젝트 진행상황 문서
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 앱 엔트리포인트
│   │   ├── routers/
│   │   │   ├── predict.py   # 재활용품 분류 API (파이프라인 통합 완료)
│   │   │   ├── health.py    # 헬스체크 엔드포인트
│   │   │   ├── feedback.py  # 피드백 엔드포인트 (DB 사용 - 선택적)
│   │   │   └── results.py   # 학습 결과 엔드포인트 (DB 사용 - 선택적)
│   │   ├── schemas.py       # Pydantic 스키마 정의
│   │   ├── db.py            # DB 설정 (현재 미사용 - 제거 예정)
│   │   └── models.py        # DB 모델 (현재 미사용 - 제거 예정)
│   ├── uploads/             # 업로드된 이미지 임시 저장 폴더
│   └── models/
│       └── prototype_model_v1.pth  # 학습된 ResNet18 모델
└── external_storage/
    └── /Volumes/TaeHyun SSD/ml_data/  # 대용량 데이터셋 (7:1.5:1.5 분할)
        ├── train/           # 6개 클래스별 대용량 데이터
        ├── valid/
        └── test/
```

## 중요한 기술적 결정사항

### 1. 모듈 설계 방식
- **파일 분리**: 각 기능별로 독립적인 파일
- **클래스 vs 전역변수**: model.py는 전역변수, 나머지는 클래스 사용
- **Import 전략**: `from model import model, transform`

### 2. 데이터 처리 방식
- **좌표 변환**: YOLO tensor → numpy → OpenCV 좌표
- **이미지 포맷**: BGR(OpenCV) ↔ RGB(PIL) 변환 고려
- **배치 처리**: 단일 객체 테스트 → 전체 객체 처리로 확장 예정

### 3. 학습 전략 및 데이터 관리
- **Transfer Learning**: ImageNet 사전훈련 → 6개 재활용 클래스 fine-tuning
- **데이터 분할**: 7:1.5:1.5 비율로 train/valid/test 분할
- **파일명 관리**: 클래스별 고유 접두사로 중복 방지
- **외장하드 활용**: 대용량 데이터 별도 관리로 Git 효율성 확보

### 4. 개발 방법론 및 요청사항 정리
- **단계별 설명**: 코드를 직접 작성하되, 한 파트씩 세밀한 설명 제공
- **Learning by Doing**: 핵심 로직은 사용자가 직접 구현하도록 가이드
- **점진적 개선**: 프로토타입 → 성능 개선 → 실용화 단계로 진행
- **문서화**: 모든 진행상황을 PROJECT_STATUS.md에 상세 기록

## 실행 방법

### 현재 테스트 실행
```bash
cd training/
python pipeline.py
# 결과: crop_test_image.jpg 생성됨 확인
```

### 개별 모듈 테스트
```bash
python yolo_detector.py  # YOLO 단독 테스트
# model.py는 학습 부분이 주석처리되어 import만 가능
```

## 해결된 이슈들

1. **파일 경로 오류**: `/datasets/` → `datasets/` (상대경로)
2. **변수명 혼동**: `boxes` → `detected_objects` (명확한 네이밍)
3. **누락된 append**: `object_info` 딕셔너리를 리스트에 추가 누락 → 수정
4. **import 혼동**: 전역변수 import 가능함을 확인

## 새로운 환경에서 시작하기

1. **필수 패키지 설치**: `ultralytics`, `torch`, `torchvision`, `opencv-python`
2. **파일 복사**: 위 4개 핵심 파일 복사
3. **테스트 실행**: `python pipeline.py`로 3단계까지 동작 확인
4. **다음 단계**: ResNet18 분류 기능 추가

## 학습된 개념들

- **YOLO 결과 구조**: `yolo_results[0].boxes` 접근 방식
- **bbox 좌표계**: `[x1, y1, x2, y2]` 형식
- **tensor 변환**: `.cpu().numpy()` 패턴
- **if __name__ == "__main__"**: 모듈 import 시 실행 방지
- **int64 vs int**: PyTorch long() 타입 변환의 필요성