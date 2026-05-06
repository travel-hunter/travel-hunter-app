# Travel Hunter Current Plan

## Current Phase

Keep the API contract stable while moving from DB-backed policy/auth/trip/profile/invite/saved policy and policy deep-link foundations into Docker-backed validation and release scoring.

## Baseline

- Frontend: React, TypeScript, Vite, React Router, `AppDataApi`, `VITE_DATA_SOURCE=mock|backend`.
- Backend: FastAPI, Pydantic schemas, SQLAlchemy models, Alembic v0.3 migration, profile preference and saved policy extension migrations, deterministic mock services, DB-backed policy/auth/trip/profile/invite/saved policy services.
- Contract: `docs/mvp-api-contract.md`.
- Current implementation spec: `docs/current-work-spec.md`.
- Next implementation priority: `docs/next-work-plan.md`.
- Repo DB baseline: `docs/db-schema-v0.3.sql`.

## Next Milestones

1. Start Docker Desktop, rerun backend-mode e2e/container validation, and update the release scorecard.
2. Refine `officialUrl`/`applyUrl` seed values when exact official campaign pages are confirmed.

## Guardrails

- Do not add `trips.slug`.
- Keep DB mode `Trip.id` as `str(trips.id)`.
- Keep `jeju-3-days` as legacy seed alias only.
- Keep API DTO fields `camelCase` and DB fields `snake_case`.
- Keep frontend pages behind the `AppDataApi` boundary.
- Keep backend routes thin and push business behavior into services.
- Update contract, tests, evals, and docs together for API shape changes.

## Verification

Run before release readiness handoff:

```bash
cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:backend
npm run build

cd ../backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config
```

Run when PostgreSQL is available through Compose:

```bash
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```
