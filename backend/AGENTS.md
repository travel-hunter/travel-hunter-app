# Backend Agent Rules

## Scope

These rules apply inside `backend/`. The backend is a FastAPI service with deterministic Mock API behavior by default and PostgreSQL-backed behavior for selected MVP flows when `BACKEND_DATA_SOURCE=db`.

## Architecture

- Keep `app/main.py` focused on app setup, middleware, and router registration.
- Keep route modules under `app/api/routes` thin.
- Put request and response models under `app/schemas`.
- Put business behavior and DTO mapping under `app/services`.
- Put DB queries under `app/repositories`.
- Put seed/mock data under `app/data`.
- Keep `/api` as the API prefix. Preserve `/health` and `/api/health` compatibility.

## Contract Rules

- API DTO fields are `camelCase`.
- Database and SQLAlchemy fields are `snake_case`.
- Do not expose `password_hash`, `provider_id`, `refresh_token_hash`, or other secret/internal fields.
- Policy detail lookup is slug based.
- Trip lookup uses an opaque string handle. DB mode returns numeric string ids and accepts `jeju-3-days` only as a legacy seed alias.
- Do not add `trips.slug`.
- For every API shape change, update `docs/mvp-api-contract.md`, Pydantic schemas, route/service behavior, backend tests, frontend types, and `.agent/evals`.

## DB Rules

- Use Alembic for schema creation. Do not use SQLAlchemy `create_all()`.
- Keep DB-backed services behind `BACKEND_DATA_SOURCE=db`.
- Keep Mock API deterministic so frontend/e2e tests remain stable.
- Cover happy paths and important not-found/error paths with `TestClient` or service tests.

## Validation

Run after backend changes:

```bash
python -m pytest
alembic upgrade head --sql
```

If compose or database-related behavior changes, also run from repo root:

```bash
docker compose -f compose.yaml config
```
