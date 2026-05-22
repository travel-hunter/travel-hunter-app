# Travel Hunter Container Deployment Guide

## Scope

This folder contains the single-container deployment setup for Travel Hunter.

This setup is separate from the existing development/staging compose files:

- `compose.yaml`
- `compose.vps.yaml`
- `compose.tunnel.yaml`

Do not modify those existing compose files unless the team explicitly decides to replace the default deployment flow.

## What Was Added

This deployment adds a single `travel-hunter` container that runs:

- Nginx
- React/Vite production build
- FastAPI backend
- PostgreSQL
- Supervisor for multi-process startup

Main files:

- `compose.container.yaml`
- `deploy/container/Dockerfile`
- `deploy/container/nginx.conf`
- `deploy/container/supervisord.conf`
- `deploy/container/entrypoint.sh`
- `deploy/container/app.env.example`

Runtime-only file:

- `deploy/container/app.env`

Do not commit `deploy/container/app.env`.

## Current Runtime Shape

External request flow:

    browser
    -> host port 18080
    -> Nginx inside travel-hunter container
    -> React static files or FastAPI API
    -> PostgreSQL inside the same container

Nginx serves the frontend from:

    /var/www/html

Nginx proxies API requests:

    /api/* -> http://127.0.0.1:8000/api/*

PostgreSQL runs inside the same container on:

    127.0.0.1:5432

## Important Port Note

Local testing currently uses port `18080` to avoid conflicts with an older temporary placeholder server on `8080`.

Open the app at:

    http://127.0.0.1:18080

The port can be changed later if the server environment is clean.

## Important Frontend Build Note

Do not set `VITE_API_BASE_URL` to `/api`.

The frontend code already calls paths like:

    /api/auth/email-check

If `VITE_API_BASE_URL=/api`, requests become:

    /api/api/auth/email-check

The current container build should use:

    VITE_API_BASE_URL: http://127.0.0.1:18080

For a real server domain, replace it with that server URL.

## Run Commands

Build and start:

    docker compose -f compose.container.yaml up -d --build

Rebuild cleanly:

    docker compose -f compose.container.yaml down
    docker compose -f compose.container.yaml build --no-cache
    docker compose -f compose.container.yaml up -d

Reset DB volume too:

    docker compose -f compose.container.yaml down -v
    docker compose -f compose.container.yaml up -d --build

## Verification

Container status:

    docker compose -f compose.container.yaml ps

Health check:

    curl http://127.0.0.1:18080/api/health

Expected response:

    {"status":"ok","service":"travel-hunter-backend","environment":"docker","database":"connected"}

Email duplicate check:

    curl -X POST http://127.0.0.1:18080/api/auth/email-check \
      -H "Content-Type: application/json" \
      -d '{"email":"test.user@example.com"}'

Expected after seed data:

    {"available":false}

## Database

The container uses a Docker volume:

    travel-hunter-postgres-data

Alembic migration runs before backend startup in `supervisord.conf`.

Seed data is manual:

    docker compose -f compose.container.yaml exec travel-hunter /app/.venv/bin/python -m app.db.seed

Check users:

    docker compose -f compose.container.yaml exec travel-hunter bash -lc 'PGPASSWORD=travelhunter psql -h 127.0.0.1 -U travelhunter -d travelhunter -c "select email, nickname from users;"'

## CI/CD Handoff Notes

Next CI/CD work should start from:

1. Confirm `compose.container.yaml` runs on the target server.
2. Replace local URLs in `app.env` and build args with the server domain.
3. Decide whether the final deployment should keep single-container PostgreSQL or move DB back out.
4. Add Jenkins steps for:
   - git pull or checkout
   - docker compose build
   - docker compose up -d
   - health check
5. Keep secrets outside GitHub.

## Do Not Commit

Never commit:

- `deploy/container/app.env`
- real DB passwords
- OAuth secrets
- SMTP credentials
- SOLAPI keys
- tunnel tokens

Commit only safe examples such as:

- `deploy/container/app.env.example`
