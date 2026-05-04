# Backend

Travel Hunter FastAPI 백엔드입니다. 현재 기본 실행은 프론트 연동용 Mock API를 유지하고, PostgreSQL 전환을 위한 SQLAlchemy/Alembic 기반 DB 스키마와 개발 seed 주입 명령을 제공합니다.

## 기술 스택

- Python 3.12
- FastAPI
- SQLAlchemy 2.x
- Alembic
- psycopg 3
- Pytest
- PostgreSQL 16

## 구조

- `app/main.py`: FastAPI 앱 생성, CORS, router 등록
- `app/core/config.py`: 환경변수 설정
- `app/api/router.py`: `/api` router 조립
- `app/api/routes`: health, auth, profile, policies, trips endpoint
- `app/schemas`: 프론트 타입과 맞춘 Pydantic request/response schema
- `app/services`: Mock business logic
- `app/data/seed.py`: DB 없이 사용하는 seed data
- `app/db`: SQLAlchemy session, Alembic metadata, 개발 seed 주입
- `app/models`: ERD v0.3 기준 SQLAlchemy model
- `alembic`: ERD v0.3 initial migration

## 로컬 실행

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

기본 데이터 소스는 Mock API다.

```bash
$env:BACKEND_DATA_SOURCE="mock"
```

PostgreSQL 연결을 확인할 때는 다음 환경변수를 사용한다.

```bash
$env:BACKEND_DATA_SOURCE="db"
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
```

헬스체크:

```bash
curl http://127.0.0.1:8000/api/health
```

## 테스트

```bash
python -m pytest
```

## DB 스키마와 Seed

ERD v0.3 기준 SQL은 앱 repo 내부의 `docs/db-schema-v0.3.sql`에 보존되어 있고, 실제 schema 생성은 Alembic migration으로 수행한다. `create_all()`은 사용하지 않는다.

```bash
alembic upgrade head
python -m app.db.seed
```

Compose DB는 host `55432` 포트로 노출한다. host `5432`에 기존 PostgreSQL이 있어도 compose DB와 충돌하지 않게 하기 위한 설정이다. 로컬 host 연결 대신 compose 네트워크 내부에서 실행할 수도 있다.

```bash
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

개발 seed는 idempotent 방식으로 동작한다. 같은 DB에서 여러 번 실행해도 `users.email`, `policies.slug`, `trip_invites.invite_token` 기준으로 중복 row를 만들지 않는다.

## 현재 범위

- `/health`, `/api/health`
- `/api/auth/login`, `/api/auth/signup`
- `/api/me`, `/api/me/profile`, `/api/profile-options`
- `/api/policies`, `/api/policies/{policySlug}`
- `/api/me/saved-policies/{policySlug}`
- `/api/trips`, `/api/trips/{tripId}`
- `/api/trips/{tripId}/policies/{policySlug}`
- `/api/trips/{tripId}/recommendations`
- `/api/trips/{tripId}/invite`
- `/api/trips/{tripId}/invites`
- `/api/invites/{inviteToken}/accept`
- ERD v0.3 SQLAlchemy model
- Alembic `0001_create_v0_3_schema` migration
- 개발용 seed script
- 정책 목록/상세 DB-backed repository/service 경계

실제 인증, 정책 실시간 조회, 정책 외 DB-backed service 전환, 실제 AI 추천은 다음 단계에서 진행합니다.
