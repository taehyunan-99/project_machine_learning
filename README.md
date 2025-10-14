# ♻️ Recycle Lens 👀

재활용품 분류 AI 서비스

## 🚀 로컬 실행

### Backend API
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
python -m http.server 8080
```

### 접속
- Frontend: http://localhost:8080/
- Backend API Docs: http://localhost:8000/docs

## 🌐 프로덕션 배포

프론트엔드는 Vercel에, 백엔드는 Railway에 배포하는 것을 권장합니다.

---

## 🚂 Railway 백엔드 배포

### 1. GitHub에 푸시
```bash
git add .
git commit -m "Railway 배포 준비"
git push origin main
```

### 2. Railway 웹사이트에서 배포
1. https://railway.app 접속 및 로그인 (GitHub 계정 연동)
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 저장소 선택

### 3. Railway 프로젝트 설정
배포가 시작되면 Settings에서 다음을 설정:

**Root Directory:**
```
backend
```

**Install Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables:**
- `TURSO_DATABASE_URL` = (Turso Database URL)
- `TURSO_AUTH_TOKEN` = (Turso Auth Token)
- `ENV` = `production`

### 4. 배포 확인
- Railway가 자동으로 URL 생성 (예: `https://your-app.up.railway.app`)
- 배포 완료 후 엔드포인트 확인:
  - API 문서: `https://your-app.up.railway.app/docs`
  - Health Check: `https://your-app.up.railway.app/health`

---

## 🎨 Vercel 프론트엔드 배포

### 환경 변수 설정 (.env)
```bash
# Turso Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Environment
ENV=production
```

### 1. Vercel 웹사이트에서 배포
1. https://vercel.com 접속 및 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결 및 선택
4. **Root Directory를 `frontend`로 설정**
5. "Deploy" 클릭

### 2. 프론트엔드 API URL 설정

배포 완료 후 Railway 백엔드 URL을 프론트엔드에 연결:

`frontend/app.js`와 `frontend/pages/stats/stats.js`의 `getApiUrl()` 함수 수정:

```javascript
function getApiUrl() {
    const hostname = window.location.hostname;

    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // Vercel 프로덕션 환경 - Railway 백엔드 URL 사용
    return 'https://your-app.up.railway.app';  // Railway URL로 변경
}
```

### 3. CORS 설정 업데이트

`backend/app/main.py` 25번째 줄에 Vercel 도메인 추가:

```python
allowed_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://your-app.vercel.app",  # 실제 Vercel URL로 변경
]
```

변경 후 커밋 및 푸시하면 자동으로 재배포됩니다.

## 📁 프로젝트 구조
```
├── backend/          # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── database.py
│   │   └── models/
│   └── requirements.txt
├── frontend/         # 정적 프론트엔드
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── pages/
│       ├── stats/
│       └── info/
└── training/         # 모델 학습 코드
    ├── train.py
    └── datasets/
```

