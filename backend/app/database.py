# SQLite 데이터베이스 연결 및 초기화

import sqlite3
import os
from contextlib import contextmanager

# DB 파일 경로
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "stats.db")

def init_db():
    """데이터베이스 초기화 및 테이블 생성"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 분석 기록 테이블
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            total_items INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 탐지된 항목 테이블
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS detected_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            confidence REAL NOT NULL,
            FOREIGN KEY (analysis_id) REFERENCES analysis_records(id)
        )
    """)

    conn.commit()
    conn.close()
    print(f"✅ 데이터베이스 초기화 완료: {DB_PATH}")

@contextmanager
def get_db():
    """데이터베이스 연결 컨텍스트 매니저"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 딕셔너리처럼 접근 가능
    try:
        yield conn
    finally:
        conn.close()
