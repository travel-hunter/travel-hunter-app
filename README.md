# Travel Hunter App

Travel Hunter is a React/Vite frontend plus FastAPI/PostgreSQL backend for the domestic travel policy and trip-planning MVP.

## Release Candidate Handoff

Recommended reading order for a new developer:

1. `CONTRIBUTING.md`: collaboration rules, branch strategy, PR rules, validation, and secret handling
2. `docs/collaboration-handoff.md`: current branch, implementation summary, next work, and blockers
3. `docs/release-candidate-handoff.md`: release candidate scope, run modes, URLs, env, and validation evidence
4. `docs/deployment-vps.md`: Docker VPS staging deployment plan
5. `docs/current-work-spec.md`: current implementation status
6. `docs/design-system-map.md`: Wanted Design System token/component mapping
7. `docs/design-qa.md`: Wanted design browser QA and Figma handoff status
8. `docs/mvp-api-contract.md`: API request/response/error contract
9. `docs/next-work-plan.md`: next priority after handoff
10. `docs/db-schema-v0.3.sql`: ERD v0.3 SQL reference
11. `docs/future-deployment.md`: later AWS/Terraform/EKS/Argo CD expansion notes

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

## Docker Compose Local Staging Mode

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

## Docker VPS Staging Direction

The MVP release candidate targets an internal-test Docker VPS staging deployment. The VPS-specific artifacts are:

- `compose.vps.yaml`: staging Compose services for `db`, `backend`, `frontend`, and `caddy`
- `deploy/Caddyfile`: HTTPS reverse proxy routing for frontend and backend
- `deploy/.env.staging.example`: staging environment template

Use `docs/deployment-vps.md` for the server setup, staging env values, Caddy routing, and smoke checklist. The local `compose.yaml` remains for local development and local release-gate validation.

VPS command outline:

```bash
cp deploy/.env.staging.example deploy/.env.staging
docker compose --env-file deploy/.env.staging -f compose.vps.yaml config
docker compose --env-file deploy/.env.staging -f compose.vps.yaml build
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d db
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d
```

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
