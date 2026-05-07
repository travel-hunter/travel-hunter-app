# Travel Hunter App

Travel Hunter is a React/Vite frontend plus FastAPI/PostgreSQL backend for a domestic travel policy and trip-planning MVP.

## Recommended Reading Order

1. `docs/requirements.md`: product requirements, roles, feature/non-functional requirements, conditional/future scope.
2. `docs/release-candidate-handoff.md`: RC scope, run modes, test account, validation evidence, blockers.
3. `docs/current-work-spec.md`: current implementation status.
4. `docs/feature-implementation-status.md`: feature completion/conditional/future status matrix.
5. `docs/deployment-tunnel.md`: Cloudflare Tunnel staging for NAT-restricted networks.
6. `docs/deployment-vps.md`: public VPS direct staging.
7. `docs/mvp-api-contract.md`: API contract.
8. `docs/next-work-plan.md`: next priority.
9. `CONTRIBUTING.md`: branch, PR, validation, and secret rules.

## Local Development

Start PostgreSQL and seed data:

```powershell
docker compose -f compose.yaml up -d db

cd backend
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
```

Start backend:

```powershell
cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start frontend:

```powershell
cd frontend
npm install
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

Local URLs:

- Frontend dev: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- Backend docs: `http://127.0.0.1:8000/docs`
- PostgreSQL host port: `127.0.0.1:55432`

Seed test account:

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## Staging Deployment Modes

Use public VPS direct mode when the server can expose `80` and `443`:

- `compose.vps.yaml`
- `deploy/Caddyfile`
- `deploy/.env.staging.example`
- Runbook: `docs/deployment-vps.md`

Use Cloudflare Tunnel mode when school or on-premise NAT rules prevent inbound access:

- `compose.tunnel.yaml`
- `deploy/Caddyfile.tunnel`
- `deploy/.env.tunnel.example`
- Runbook: `docs/deployment-tunnel.md`

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
