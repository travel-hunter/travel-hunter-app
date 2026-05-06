# Frontend

Travel Hunter MVP frontend built with React, TypeScript, Vite, and React Router.

## Routes

- `/`, `/onboarding`
- `/signup`
- `/login`
- `/profile-setup`
- `/home`
- `/policies`
- `/policies/:policySlug`
- `/trips`
- `/trips/new`
- `/trips/:tripId`
- `/ai-results`
- `/friend-invite`
- `/invites/:inviteToken/accept`
- `/mypage`

## Data Access

Pages access data only through `src/api` and `AppDataApi`. Runtime mock mode has been removed, so the frontend always calls FastAPI.

- Backend URL: `VITE_API_BASE_URL=http://127.0.0.1:8000`
- Auth: `Authorization: Bearer <accessToken>`
- Refresh session: HttpOnly cookie via `credentials: "include"`

## Local Run

Start PostgreSQL and FastAPI first:

```powershell
docker compose -f ..\compose.yaml up -d db

cd ..\backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then start Vite:

```powershell
cd ..\frontend
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

Default dev server:

```text
http://127.0.0.1:5173
```

## Docker Compose Preview

```powershell
docker compose -f ..\compose.yaml build
docker compose -f ..\compose.yaml up -d db
docker compose -f ..\compose.yaml run --rm backend alembic upgrade head
docker compose -f ..\compose.yaml run --rm backend python -m app.db.seed
docker compose -f ..\compose.yaml up -d backend frontend
```

Preview URL:

```text
http://127.0.0.1:4173
```

## Validation

`npm test` and `npm run test:e2e` start compose PostgreSQL, run Alembic/seed, start FastAPI on `127.0.0.1:8001`, and run against the real backend.

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```
