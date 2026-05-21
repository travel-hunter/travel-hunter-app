# Release Handoff - 2026-05-20

## Scope

- Branch: `develop`.
- Merge commit: `9bdcb73`.
- Target environment: staging smoke candidate through Cloudflare Tunnel.
- Product baseline: DB-backed-only MVP; runtime mock mode is removed.
- API baseline: trip route handles are numeric string `Trip.id` values only.
- DB scope: no schema or migration change in this handoff.

## Included Changes

- Removed support for the old non-numeric 제주 trip handle while keeping the 제주 development seed trip data.
- Updated backend trip resolution, repositories, route/service tests, frontend API boundary calls, route smoke tests, API contract evals, and current planning docs to the numeric-only trip id policy.
- Refreshed current work status and next-work priorities for the staging smoke path.
- Synced the handoff through PR #23 into `develop`.

## Validation Evidence

Passed on 2026-05-20:

- `cd frontend && npm run typecheck`
- `cd frontend && npm test` - 82 tests passed.
- `cd frontend && npm run test:e2e` - 4 tests passed.
- `cd frontend && npm run build`
- `cd backend && python -m pytest` - 218 tests passed.
- `python -m json.tool .agent/evals/api-contract-golden.json`
- `docker compose -f compose.yaml config`
- `docker compose -f compose.yaml config --quiet`
- `git diff --check` - only expected CRLF warnings from Git appeared.
- Scoped stale alias-policy search - no stale backend/frontend/eval support references remained.

Not rerun for this handoff:

- `alembic upgrade head --sql`: skipped because this change does not modify schema or migrations.
- Public HTTPS smoke: blocked until real staging domain, tunnel token, and host env are available.
- SMTP, OAuth, and SOLAPI provider smoke: blocked until real provider credentials and console configuration are available.

## Staging Handoff Steps

Prepare only on the staging/tunnel host. Do not commit the real env file.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d
curl -fsS https://<domain>/api/health
```

Minimum public smoke after startup:

- `https://<domain>/api/health`
- `https://<domain>/login`
- `https://<domain>/policies`
- `https://<domain>/trips`
- `https://<domain>/mypage`

## Required Environment Inputs

- `STAGING_DOMAIN`
- `VITE_API_BASE_URL`
- `CORS_ORIGINS`
- `REFRESH_COOKIE_SECURE=true`
- PostgreSQL credentials and `DATABASE_URL`
- `AUTH_SECRET_KEY`
- `CLOUDFLARE_TUNNEL_TOKEN`
- Optional provider envs for SMTP, OAuth, and SOLAPI smoke

## Remaining Risks

- The candidate is ready for staging bring-up, but not fully release-ready until public HTTPS smoke passes.
- Provider flows remain unverified in a real staging environment.
- Jenkins CD is still planned work; current handoff assumes manual Docker Compose operation on the staging/tunnel host.
