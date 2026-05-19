# 로컬 개발 환경 구축

## 목표 구조

로컬 개발자는 WSL 또는 Windows PowerShell에서 Docker Compose로 PostgreSQL을 띄우고, backend와 frontend를 각각 개발 서버로 실행한다.

기본 포트:

- PostgreSQL: `127.0.0.1:55432`
- FastAPI: `127.0.0.1:8000`
- Vite: `127.0.0.1:5173`

## 필수 도구

- Git
- Docker Engine 또는 Docker Desktop
- Docker Compose plugin
- Node.js 22
- Python 3.12
- PowerShell 또는 WSL shell

WSL에 Docker Engine을 직접 설치하는 경우 Docker daemon이 실행 중인지 먼저 확인한다.

```bash
docker version
docker compose version
```

## 저장소 준비

```bash
git clone <repo-url> travel-hunter-app
cd travel-hunter-app
git checkout develop
```

## DB 실행

```bash
docker compose -f compose.yaml up -d db
```

DB health 확인:

```bash
docker compose -f compose.yaml ps
```

## Backend 실행

PowerShell 기준:

```powershell
cd backend
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
$env:REFRESH_COOKIE_SECURE="false"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

## Frontend 실행

새 터미널에서 실행한다.

```powershell
cd frontend
npm ci
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

브라우저:

```text
http://127.0.0.1:5173
```

## Docker Compose Preview

개발 서버 대신 Docker 이미지 기준으로 확인할 때 사용한다.

```bash
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml up -d backend frontend
```

Preview URL:

```text
http://127.0.0.1:4173
```

## 자주 쓰는 초기화

컨테이너 중지:

```bash
docker compose -f compose.yaml down
```

DB volume까지 삭제해야 할 때만 사용:

```bash
docker compose -f compose.yaml down -v
```

`down -v`는 로컬 DB 데이터를 삭제한다. 팀 공유 DB나 운영 서버에서 사용하지 않는다.

