FROM python:3.11-slim

# OpenCV 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 서버 실행
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
