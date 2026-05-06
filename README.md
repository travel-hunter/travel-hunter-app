# Travel Hunter App

Travel Hunter is a React/Vite frontend plus FastAPI backend for the domestic travel policy and trip-planning MVP.

## Current Source Of Truth

- `docs/current-work-spec.md`: current implementation status
- `docs/mvp-api-contract.md`: API contract
- `docs/next-work-plan.md`: next priority
- `docs/db-schema-v0.3.sql`: ERD v0.3 SQL reference

## Local Development

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

PostgreSQL through Compose:

```bash
docker compose -f compose.yaml up -d db
cd backend
alembic upgrade head
python -m app.db.seed
```

## Release Readiness Validation

Run before staging handoff:

```bash
cd backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build

cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:backend
npm run build
```

If Docker Desktop is unavailable locally, record `docker compose build` and backend-mode e2e as blockers in `CHECKLIST.md`.
