# Backend Agent Rules

## Scope

These rules apply inside `backend/`. The backend is a FastAPI service that currently provides Mock API responses matching the MVP contract before PostgreSQL persistence is implemented.

## Architecture

- Keep `app/main.py` focused on app setup, middleware, and router registration.
- Keep route modules under `app/api/routes` thin.
- Put request and response models under `app/schemas`.
- Put business behavior under `app/services`.
- Put seed/mock data under `app/data`.
- Keep `/api` as the API prefix. Preserve `/health` and `/api/health` compatibility.

## Contract Rules

- API DTO fields are `camelCase`.
- Database and future SQLAlchemy fields are `snake_case`.
- Do not expose `password_hash`, `provider_id`, `refresh_token_hash`, or other secret/internal fields.
- Policy detail lookup is slug based.
- Trip lookup uses internal id. Current mock id `jeju-3-days` is compatibility data, not a DB design decision.
- For every API shape change, update `docs/mvp-api-contract.md`, Pydantic schemas, route/service behavior, backend tests, frontend types, and `.agent/evals`.

## Mock API Rules

- Do not introduce real DB dependencies until the DB migration plan is approved and implemented.
- Keep Mock API deterministic so frontend/e2e tests remain stable.
- Cover happy paths and important not-found/error paths with `TestClient`.

## Validation

Run after backend changes:

```bash
python -m pytest
```

If compose or database-related behavior changes, also run from repo root:

```bash
docker compose -f compose.yaml config
```
