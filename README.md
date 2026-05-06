# Travel Hunter App

Travel Hunter is a React/Vite frontend plus FastAPI/PostgreSQL backend for the domestic travel policy and trip-planning MVP.

## Release Candidate Handoff

Recommended reading order for a new developer:

1. `docs/release-candidate-handoff.md`: release candidate scope, run modes, URLs, env, and validation evidence
2. `docs/current-work-spec.md`: current implementation status
3. `docs/mvp-api-contract.md`: API request/response/error contract
4. `docs/next-work-plan.md`: next priority after handoff
5. `docs/db-schema-v0.3.sql`: ERD v0.3 SQL reference
6. `docs/future-deployment.md`: later AWS/Terraform/EKS/Argo CD expansion notes

## Local Development

Start PostgreSQL and seed data:

```powershell
docker compose -f compose.yaml up -d db
cd backend
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
alembic upgrade head
python -m app.db.seed
```

Start backend:

```powershell
cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start frontend:

```powershell
cd frontend
npm install
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

## Docker Compose Staging Mode

```powershell
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml up -d backend frontend
```

Default local compose URLs:

- Frontend preview: `http://127.0.0.1:4173`
- Backend API: `http://127.0.0.1:8000`
- Backend API docs: `http://127.0.0.1:8000/docs`
- PostgreSQL host port: `127.0.0.1:55432`

Seeded test account:

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## Release Readiness Validation

```powershell
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
npm run build
```

`npm test` and `npm run test:e2e` run against FastAPI and PostgreSQL. Runtime mock mode has been removed.
