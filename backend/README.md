# Backend

Travel Hunter FastAPI backend. Runtime mock mode has been removed; user-facing auth and data flows use PostgreSQL through SQLAlchemy and Alembic.

## Stack

- Python 3.12+
- FastAPI
- SQLAlchemy 2.x
- Alembic
- psycopg 3
- PostgreSQL 16
- pwdlib Argon2 password hashing
- PyJWT
- Pytest

## Structure

- `app/main.py`: FastAPI app, CORS, router registration
- `app/core`: environment config and auth/security helpers
- `app/api/routes`: thin health, auth, profile, policies, trips, invites routes
- `app/schemas`: Pydantic request/response models
- `app/services`: business behavior and DTO mapping
- `app/repositories`: DB query boundaries
- `app/data`: seed/static constants
- `app/db`: SQLAlchemy session, Alembic metadata, dev seed command
- `app/models`: ERD v0.3 SQLAlchemy models
- `alembic`: migrations

## Local Run

```powershell
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Auth settings:

```powershell
$env:ACCESS_TOKEN_EXPIRE_MINUTES="30"
$env:REFRESH_TOKEN_EXPIRE_DAYS="14"
$env:REFRESH_COOKIE_NAME="travel_hunter_refresh"
$env:REFRESH_COOKIE_SECURE="false"
```

Notification settings:

```powershell
$env:NOTIFICATION_SCHEDULER_ENABLED="false"
$env:NOTIFICATION_RUN_AT="09:00"
$env:NOTIFICATION_POLL_SECONDS="60"
$env:NOTIFICATION_RETRY_ENABLED="true"
$env:NOTIFICATION_RETRY_MAX_ATTEMPTS="3"
$env:NOTIFICATION_RETRY_DELAY_SECONDS="600"
$env:KAKAO_ALIMTALK_ENABLED="false"
$env:SOLAPI_BASE_URL="https://api.solapi.com"
```

When enabling SOLAPI AlimTalk dispatch, also set `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_PF_ID`, `SOLAPI_TEMPLATE_ID_D7`, `SOLAPI_TEMPLATE_ID_D1`, and `TRAVEL_HUNTER_PUBLIC_BASE_URL`.

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

## DB Schema And Seed

The v0.3 reference SQL is preserved in `../docs/db-schema-v0.3.sql`. Runtime schema creation uses Alembic only; do not use SQLAlchemy `create_all()`.

```bash
alembic upgrade head
python -m app.db.seed
```

Compose exposes PostgreSQL on host `55432`.

```bash
docker compose -f ../compose.yaml up -d db
docker compose -f ../compose.yaml run --rm backend alembic upgrade head
docker compose -f ../compose.yaml run --rm backend python -m app.db.seed
```

Seeded test account:

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## Implemented API Scope

- `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- `/api/me`, `/api/me/profile`, `/api/me/contact`, `/api/me/notification-settings`, `/api/profile-options`
- `/api/me/saved-policies`
- `/api/me/saved-policies/{policySlug}`
- `/api/policies`, `/api/policies/{policySlug}`
- `/api/trips`, `/api/trips/{tripId}`
- `/api/trips/{tripId}/policies/{policySlug}`
- `/api/trips/{tripId}/recommendations`
- `/api/trips/{tripId}/invite`
- `/api/trips/{tripId}/invites`
- `/api/invites/{inviteToken}/accept`

Policy detail responses expose `policies.official_url` as `officialUrl` and `policies.apply_url` as `applyUrl`. Frontend application CTAs use `applyUrl` first, then `officialUrl`, then the preparation notice when both are null.

Notification delivery has no public dispatch endpoint. The internal scheduler calculates D-7/D-1 saved-policy deadline candidates and, when `KAKAO_ALIMTALK_ENABLED=true`, dispatches pending rows through SOLAPI.

## Validation

```bash
python -m pytest
alembic upgrade head --sql
```

## Staging Notes

- Use a strong non-default `AUTH_SECRET_KEY`.
- Use `REFRESH_COOKIE_SECURE=true` behind HTTPS.
- Set `DATABASE_URL` to the staging PostgreSQL instance using the `postgresql+psycopg://` scheme.
- Set `CORS_ORIGINS` to the deployed frontend origin.
- Apply schema with Alembic only.

Release-candidate handoff details are in `../docs/release-candidate-handoff.md`.
