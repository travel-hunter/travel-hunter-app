# Backend

Travel Hunter FastAPI backend. The service keeps deterministic Mock API behavior by default and switches selected MVP flows to PostgreSQL-backed behavior with `BACKEND_DATA_SOURCE=db`.

## Stack

- Python 3.12+
- FastAPI
- SQLAlchemy 2.x
- Alembic
- psycopg 3
- pwdlib Argon2 password hashing
- PyJWT
- PostgreSQL 16
- Pytest

## Structure

- `app/main.py`: FastAPI app, CORS, router registration
- `app/core`: environment config and auth/security helpers
- `app/api/routes`: thin health, auth, profile, policies, trips, invites routes
- `app/schemas`: Pydantic request/response models
- `app/services`: business behavior and DTO mapping
- `app/repositories`: DB query boundaries
- `app/data`: deterministic mock/seed data
- `app/db`: SQLAlchemy session, Alembic metadata, dev seed command
- `app/models`: ERD v0.3 SQLAlchemy models
- `alembic`: ERD v0.3 migration

## Local Run

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Default mode:

```powershell
$env:BACKEND_DATA_SOURCE="mock"
```

DB-backed mode:

```powershell
$env:BACKEND_DATA_SOURCE="db"
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
```

Auth settings:

```powershell
$env:ACCESS_TOKEN_EXPIRE_MINUTES="30"
$env:REFRESH_TOKEN_EXPIRE_DAYS="14"
$env:REFRESH_COOKIE_NAME="travel_hunter_refresh"
$env:REFRESH_COOKIE_SECURE="false"
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

## DB Schema And Seed

The v0.3 reference SQL is preserved in `docs/db-schema-v0.3.sql`. Runtime schema creation uses Alembic only; do not use SQLAlchemy `create_all()`.

```bash
alembic upgrade head
python -m app.db.seed
```

Compose exposes PostgreSQL on host `55432`.

```bash
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

## Current DB-backed Scope

- `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- `/api/me`
- `/api/policies`, `/api/policies/{policySlug}`
- `/api/trips`, `/api/trips/{tripId}`
- `/api/trips/{tripId}/policies/{policySlug}`
- `/api/trips/{tripId}/recommendations`
- `/api/trips/{tripId}/invite`
- `/api/trips/{tripId}/invites`

Mock-only or partial scope:

- `/api/me/profile` profile style/budget persistence
- `/api/me/saved-policies/{policySlug}` DB persistence
- `/api/invites/{inviteToken}/accept` DB membership handling
- social login, real policy collection, real AI recommendations, real invite delivery

## Validation

```bash
python -m pytest
alembic upgrade head --sql
```
