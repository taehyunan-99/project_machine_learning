# ♻️ Recycle Lens

#### [🌐 Web Link](https://project-machine-learning-eight.vercel.app)

## AI 기반 재활용품 분류 및 처리 경로 시각화 시스템

Recycle Lens는 YOLO11s와 ResNet18을 결합한 2단계 AI 파이프라인으로 재활용품을 자동 분류하고, 서울시 재활용 처리 경로를 시각화하는 웹 애플리케이션입니다.

### 주요 기능
- 🔍 이미지 업로드 기반 재활용품 분석
- 📹 실시간 웹캠 객체 탐지 및 분류
- 🗺️ 위치 기반 재활용 처리 경로 시각화
- 📊 분석 통계 및 오답률 피드백 시스템

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
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 앱 진입점
│   │   ├── database.py             # Turso DB 클라이언트
│   │   └── routers/
│   │       ├── predict.py          # 이미지 분류 API
│   │       ├── stats.py            # 통계 저장/조회 API
│   │       ├── feedback.py         # 피드백 수집 API
│   │       ├── geocoding.py        # 역지오코딩 프록시
│   │       └── health.py           # 헬스 체크
│   ├── training/
│   │   ├── model.py                # ResNet18 학습 코드
│   │   ├── pipeline.py             # YOLO+ResNet 파이프라인
│   │   └── yolo_detector.py        # YOLO11s 탐지 모듈
│   ├── models/
│   │   ├── yolo11s.pt              # YOLO Model
│   │   └── model_v4.pth            # ResNet18 Model
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── index.html                  # 메인 페이지
│   ├── app.js                      # 핵심 로직 (업로드/실시간/지도)
│   ├── style.css                   # 전체 스타일
│   └── pages/
│       ├── stats/
│       │   ├── stats.html          # 통계 대시보드
│       │   ├── stats.js
│       │   └── stats.css
│       └── info/
│           ├── info.html           # 프로젝트 소개 대시보드
│           ├── info.js
│           └── info.css
├── railway.toml                    # Railway 배포 설정
└── README.md
```

## 🎯 기술 스택

### 🤖 AI/ML
- [![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
- [![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat&logo=pytorch&logoColor=white)](https://pytorch.org/)
- [![YOLO](https://img.shields.io/badge/YOLO-00FFFF?style=flat&logo=yolo&logoColor=black)](https://ultralytics.com/)
- [![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=flat&logo=opencv&logoColor=white)](https://opencv.org/)

### 🔧 Backend
- [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
- [![Turso](https://img.shields.io/badge/Turso-4FF8D2?style=flat&logo=turso&logoColor=black)](https://turso.tech/)

### 🌐 Frontend
- [![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
- [![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

### ☁️ 배포
- [![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)](https://railway.app/)
- [![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)
- [![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)