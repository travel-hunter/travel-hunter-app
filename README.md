# Travel Hunter App

Travel Hunter is a React/Vite frontend plus FastAPI/PostgreSQL backend for a domestic travel policy and trip-planning MVP.

## Recommended Reading Order

1. `docs/requirements.md`: product requirements, roles, feature/non-functional requirements, conditional/future scope.
2. `docs/current-work-spec.md`: current implementation status.
3. `docs/implemented-feature-spec.md`: implemented user behavior and API/DB links.
4. `docs/mvp-api-contract.md`: API contract.
5. `docs/db-schema-current.md`: current Alembic-head DB schema reference.
6. `docs/deployment-cicd/README.md`: team deployment/CICD workflow.
7. `docs/next-work-plan.md`: next priority.
8. `CONTRIBUTING.md`: branch, PR, validation, and secret rules.

## Local Development

Detailed setup lives in `docs/local-dev-runtime.md`. Minimum local flow for database and backend:

```powershell
docker compose -f compose.yaml up -d db
cd backend
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend in another terminal:

```powershell
cd frontend
npm install
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

- Frontend dev: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- Backend docs: `http://127.0.0.1:8000/docs`
- PostgreSQL host port: `127.0.0.1:55432`
- Seed test account: `test.user@example.com` / `password123`

## Deployment

- `compose.tunnel.yaml`
- `deploy/Caddyfile.tunnel`
- `deploy/.env.tunnel.example`
- Runbook: `docs/deployment-cicd/README.md`

Real `.env` files, DB passwords, `AUTH_SECRET_KEY`, and Cloudflare tunnel tokens must not be committed.

## Validation

Fast lane:

```powershell
cd frontend
npm run typecheck
npm test

cd ..\backend
python -m pytest
```

Release gate:

```powershell
cd frontend
npm run test:e2e
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
```

`npm test` and `npm run test:e2e` run against FastAPI and PostgreSQL. Runtime mock mode has been removed.

## Codex Workflow

Team AI/Codex rules live in `docs/deployment-cicd/06-ai-workflow.md`. Local helper scripts are in `scripts/codex-*.ps1`.
