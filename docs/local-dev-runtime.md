# Travel Hunter Local Development Runtime

## Purpose

Use this runtime while frontend UI work is still changing frequently.

The development default is:

- PostgreSQL and FastAPI backend run in Docker.
- React frontend runs through Vite dev server on port `5173`.
- Docker frontend on port `4173` is reserved for final production-build verification.
- LAN/classroom sharing is not enabled during normal development.

## Default Development Flow

Start only the database and backend containers:

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app
docker compose up -d db backend
docker compose ps
```

Confirm backend health:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

Start the frontend in dev mode:

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app\frontend
npm run dev
```

Open the app:

```text
http://127.0.0.1:5173/
```

## Why This Is The Default

Vite dev server updates the browser almost immediately after saving frontend files.

Running `docker compose up -d --build frontend` for every UI change is slower because it performs a production build, image export, and container restart. Use it only when checking final Docker behavior.

## Final Docker Frontend Check

After the UI work is ready, run:

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app
docker compose up -d --build frontend
```

Then check:

```text
http://127.0.0.1:4173/
```

## Port Standard

- `5173`: Vite dev frontend, fast UI iteration.
- `4173`: Docker production frontend, final verification.
- `8000`: FastAPI backend.
- `55432`: PostgreSQL exposed from Docker.

## Classroom Sharing Policy

Do not enable LAN/classroom sharing during normal UI development.

When development is complete and other people need to view the app from their devices, use the Cloudflare Tunnel flow described in `compose.tunnel.yaml` and `deploy/.env.tunnel.example`. That step may require public hostname, CORS, and secret/env settings.

## Quick Checks

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

Before committing frontend work:

```powershell
cd C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app\frontend
npm run typecheck
npm test -- --run
npm run build

cd ..
git diff --check
```
