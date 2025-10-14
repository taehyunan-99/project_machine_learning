# Turso 데이터베이스 연결 및 초기화 (HTTP API 사용)

import os
import requests
from contextlib import contextmanager
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# Turso 데이터베이스 설정
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

# libsql:// URL을 HTTPS URL로 변환
def get_https_url(libsql_url):
    """libsql://host -> https://host"""
    return libsql_url.replace("libsql://", "https://")

# Turso HTTP API 클라이언트
class TursoClient:
    """Turso HTTP API 클라이언트 (SQLite 호환)"""

    def __init__(self, url, auth_token):
        self.base_url = get_https_url(url)
        self.auth_token = auth_token
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        self.last_result = None

    def execute(self, sql, params=None):
        """SQL 실행"""
        # Turso HTTP API 올바른 형식
        payload = {
            "requests": [
                {
                    "type": "execute",
                    "stmt": {
                        "sql": sql
                    }
                }
            ]
        }

        # 파라미터가 있으면 Turso 형식으로 변환하여 추가
        if params:
            # Turso args 형식: [{"type": "...", "value": "..."}]
            # 모든 value는 문자열로 전달 (타입만 지정)
            turso_args = []
            for param in params:
                if param is None:
                    turso_args.append({"type": "null"})
                elif isinstance(param, bool):
                    # bool은 int의 서브클래스이므로 먼저 체크
                    turso_args.append({"type": "integer", "value": str(int(param))})
                elif isinstance(param, int):
                    turso_args.append({"type": "integer", "value": str(param)})
                elif isinstance(param, float):
                    # float는 숫자 타입으로 전달
                    turso_args.append({"type": "float", "value": param})
                else:
                    turso_args.append({"type": "text", "value": str(param)})
            payload["requests"][0]["stmt"]["args"] = turso_args

        try:
            response = requests.post(
                f"{self.base_url}/v2/pipeline",
                headers=self.headers,
                json=payload,
                timeout=10
            )

            if response.status_code != 200:
                raise Exception(f"Turso API error {response.status_code}: {response.text}")

            result = response.json()
            self.last_result = result
            return self

        except requests.exceptions.RequestException as e:
            raise Exception(f"Turso 연결 오류: {str(e)}")

    def fetchone(self):
        """첫 번째 행 가져오기"""
        if not self.last_result:
            return None

        # Turso 응답 형식: {"results": [{"response": {"result": {"rows": [...]}}}]}
        results = self.last_result.get("results", [])
        if not results:
            return None

        response = results[0].get("response", {})
        result = response.get("result", {})
        rows = result.get("rows", [])

        if not rows:
            return None

        # 첫 번째 행 처리
        row = rows[0]

        # Turso는 행을 dict 배열로 반환: [{"type": "text", "value": "foo"}]
        if isinstance(row, list) and len(row) > 0 and isinstance(row[0], dict):
            return tuple(col.get("value") for col in row)
        elif isinstance(row, list):
            return tuple(row)
        else:
            return tuple(row.values())

    def fetchall(self):
        """모든 행 가져오기"""
        if not self.last_result:
            return []

        results = self.last_result.get("results", [])
        if not results:
            return []

        response = results[0].get("response", {})
        result = response.get("result", {})
        rows = result.get("rows", [])

        # 각 행을 튜플로 변환
        processed_rows = []
        for row in rows:
            # Turso는 행을 dict 배열로 반환: [{"type": "text", "value": "foo"}]
            if isinstance(row, list) and len(row) > 0 and isinstance(row[0], dict):
                processed_rows.append(tuple(col.get("value") for col in row))
            elif isinstance(row, list):
                processed_rows.append(tuple(row))
            else:
                processed_rows.append(tuple(row.values()))
        return processed_rows

    @property
    def lastrowid(self):
        """마지막 삽입된 행의 ID"""
        if not self.last_result:
            return None

        results = self.last_result.get("results", [])
        if not results:
            return None

        response = results[0].get("response", {})
        result = response.get("result", {})
        return result.get("last_insert_rowid")

# Turso 클라이언트 생성
def create_turso_client():
    """Turso 클라이언트 생성"""
    if not TURSO_DATABASE_URL or not TURSO_AUTH_TOKEN:
        raise ValueError("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env file")

    print(f"🔗 Turso 연결 (HTTP API): {TURSO_DATABASE_URL}")

    return TursoClient(TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)

def init_db():
    """데이터베이스 초기화 및 테이블 생성"""
    client = create_turso_client()

    # 분석 기록 테이블
    client.execute("""
        CREATE TABLE IF NOT EXISTS analysis_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            total_items INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 탐지된 항목 테이블
    client.execute("""
        CREATE TABLE IF NOT EXISTS detected_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            confidence REAL NOT NULL,
            FOREIGN KEY (analysis_id) REFERENCES analysis_records(id)
        )
    """)

    # 피드백 테이블 (잘못된 분류 보고)
    client.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            predicted_class TEXT NOT NULL,
            actual_class TEXT NOT NULL,
            confidence REAL NOT NULL,
            timestamp TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    print(f"✅ Turso 데이터베이스 초기화 완료: {TURSO_DATABASE_URL}")

@contextmanager
def get_db():
    """데이터베이스 연결 컨텍스트 매니저"""
    client = create_turso_client()
    try:
        yield client
    finally:
        # libsql-client는 자동으로 연결을 관리하므로 명시적 close 불필요
        pass
