# Backend 작업 설명서

## 역할

백엔드는 FastAPI, SQLAlchemy, Alembic, PostgreSQL 기반이다. user-facing 데이터는 PostgreSQL 경로를 사용하며 runtime mock API mode는 없다.

## 구조

- `app/main.py`: app setup, middleware, router registration.
- `app/api/routes`: 얇은 route layer.
- `app/schemas`: Pydantic request/response DTO.
- `app/services`: business behavior, DTO mapping.
- `app/repositories`: DB query boundary.
- `app/models`: SQLAlchemy model.
- `app/data`: seed/static data.
- `alembic`: migration.

## 핵심 규칙

- route에는 비즈니스 로직을 많이 넣지 않는다.
- request/response shape는 `app/schemas`에 둔다.
- DB query는 repository에 둔다.
- API DTO field는 `camelCase`다.
- DB, SQLAlchemy, SQL field는 `snake_case`다.
- password hash, refresh token hash, provider id 등 내부 값은 response에 노출하지 않는다.
- schema 생성은 Alembic만 사용한다. `create_all()`을 앱 schema 생성에 사용하지 않는다.

## 로컬 실행

```powershell
cd backend
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API 변경 절차

API shape가 바뀌면 아래를 같이 수정한다.

- `docs/mvp-api-contract.md`
- `backend/app/schemas`
- route/service/repository behavior
- backend tests
- `frontend/src/api/types.ts`
- frontend API client and affected screens
- `.agent/evals/api-contract-golden.json`

API 변경이 없으면 PR 또는 작업 기록에 "API 변경 없음"을 명시한다.

## 검증 명령

```bash
cd backend
python -m pytest
alembic upgrade head --sql
```

Compose나 env 관련 변경이 있으면 repo root에서 추가 확인한다.

```bash
docker compose -f compose.yaml config
```

## 배포 전 확인

- `DATABASE_URL`이 배포 DB를 가리키는지 확인한다.
- `AUTH_SECRET_KEY`가 dev 기본값이 아닌지 확인한다.
- HTTPS 배포에서는 `REFRESH_COOKIE_SECURE=true`를 사용한다.
- `CORS_ORIGINS`가 실제 frontend origin과 일치하는지 확인한다.
- migration이 먼저 적용된 뒤 app container를 올린다.

