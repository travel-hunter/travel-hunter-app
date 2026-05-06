# Travel Hunter App

Travel Hunter is a React/Vite frontend plus FastAPI backend for the domestic travel policy and trip-planning MVP.

## Release Candidate Handoff

The current MVP release candidate is documented for Docker Compose based staging handoff.

Recommended reading order for a new developer:

1. `docs/release-candidate-handoff.md`: release candidate scope, run modes, URLs, env, and validation evidence
2. `docs/current-work-spec.md`: current implementation status
3. `docs/mvp-api-contract.md`: API request/response/error contract
4. `docs/next-work-plan.md`: next priority after handoff
5. `docs/db-schema-v0.3.sql`: ERD v0.3 SQL reference

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

## Docker Compose Staging Mode

Use this mode for release-candidate handoff validation.

```bash
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml up -d backend frontend
```

Default local compose URLs:

- Frontend preview: `http://127.0.0.1:4173`
- Backend API: `http://127.0.0.1:8000`
- PostgreSQL host port: `127.0.0.1:55432`

## Release Readiness Validation

Run before staging handoff:

```bash
cd backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed

cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:backend
npm run build
```

If Docker Desktop is unavailable locally, record `docker compose build` and backend-mode e2e as blockers in `CHECKLIST.md`.
