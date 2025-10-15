# ♻️ Recycle Lens

#### [🌐 Web Link](https://project-machine-learning-msdt41gv5-taehyunans-projects.vercel.app/index.html)

## AI 기반 재활용품 분류 시스템을 개발한 프로젝트입니다

Recycle Lens는 YOLO11m과 ResNet18을 결합한 2단계 파이프라인으로 재활용품을 자동으로 분류하는 시스템입니다.
이미지 업로드와 실시간 웹캠 인식을 통해 캔, 유리, 종이, 플라스틱, 스티로폼, 비닐 총 6개 카테고리를 분류합니다.

## 🚀 로컬 실행

### Backend API

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
python -m http.server 8080
```

### 접속

-   Frontend: http://localhost:8080/
-   Backend API Docs: http://localhost:8000/docs

## 📁 프로젝트 구조

```
├── backend/              # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py       # FastAPI 앱
│   │   ├── database.py   # DB 연결
│   │   └── routers/      # API 라우터
│   ├── models/           # 학습된 모델 파일
│   │   ├── yolo11m.pt
│   │   └── model_v4.pth
│   ├── training/         # 모델 학습 코드
│   │   ├── model.py
│   │   ├── pipeline.py
│   │   ├── yolo_detector.py
│   │   ├── datasets/
│   │   └── sample_data/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # 정적 프론트엔드
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── pages/
│       ├── stats/        # 통계 페이지
│       └── info/         # 소개 페이지
├── railway.toml          # Railway 배포 설정
└── README.md
```
