# Backend

Travel Hunter FastAPI backend. The service keeps deterministic Mock API behavior by default and can switch selected endpoints to PostgreSQL-backed behavior with `BACKEND_DATA_SOURCE=db`.

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
- `alembic`: ERD v0.3 initial migration

## Local Run

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Default mode is Mock API:

```bash
$env:BACKEND_DATA_SOURCE="mock"
```

DB-backed mode:

```bash
$env:BACKEND_DATA_SOURCE="db"
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
```

Auth settings:

```bash
$env:ACCESS_TOKEN_EXPIRE_MINUTES="30"
$env:REFRESH_TOKEN_EXPIRE_DAYS="14"
$env:REFRESH_COOKIE_NAME="travel_hunter_refresh"
$env:REFRESH_COOKIE_SECURE="false"
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

## Tests

```bash
python -m pytest
```

## DB Schema And Seed

The v0.3 reference SQL is preserved in `docs/db-schema-v0.3.sql`. Runtime schema creation uses Alembic only; do not use SQLAlchemy `create_all()`.

```bash
alembic upgrade head
python -m app.db.seed
```

Compose exposes PostgreSQL on host `55432` to avoid conflicts with an existing local `5432` PostgreSQL.

```bash
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

The dev seed is idempotent for row creation by `users.email`, `policies.slug`, and `trip_invites.invite_token`.

## Current Scope

- `/health`, `/api/health`
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- `/api/me`, `/api/me/profile`, `/api/profile-options`
- `/api/policies`, `/api/policies/{policySlug}`
- trip, recommendation, and invite Mock API endpoints
- ERD v0.3 SQLAlchemy models and Alembic migration
- development seed script
- policy list/detail DB-backed repository/service boundary
- DB-backed auth foundation for signup/login/me/refresh/logout

Out of scope for the current backend foundation: social login, real policy collection, all trip persistence, real AI recommendations, and real invite delivery.
