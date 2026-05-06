# Travel Hunter Current Plan

## Current Phase

The MVP is DB-backed-only and runtime mock mode has been removed. Docker VPS direct staging artifacts and Cloudflare Tunnel staging artifacts exist, but the current working priority is user-facing feature completion. Trip place editing, mypage profile editing, and adding AI recommendation items to a trip timeline are implemented; the next functional priority is persisting invite role settings for `viewer/editor`. Deployment and Jenkins automation are deferred until the feature pass pauses or release staging resumes.

## Source Of Truth

- Current implementation spec: `docs/current-work-spec.md`
- Release candidate handoff: `docs/release-candidate-handoff.md`
- Public VPS runbook: `docs/deployment-vps.md`
- Cloudflare Tunnel runbook: `docs/deployment-tunnel.md`
- API contract: `docs/mvp-api-contract.md`
- Next priority: `docs/next-work-plan.md`
- Future deployment notes: `docs/future-deployment.md`

## Guardrails

- Do not add `trips.slug`.
- Keep DB mode `Trip.id` as `str(trips.id)`.
- Keep `jeju-3-days` as legacy seed alias only.
- Keep API DTO fields `camelCase` and DB fields `snake_case`.
- Keep frontend pages behind the `AppDataApi` boundary.
- Keep backend routes thin and push business behavior into services.
- Do not reintroduce runtime mock mode.
- Do not commit real `.env` files, tunnel tokens, DB passwords, or auth secrets.

## Fast Lane Verification

```bash
cd frontend
npm run typecheck
npm test

cd ../backend
python -m pytest
```

Run only when a migration changes:

```bash
cd backend
alembic upgrade head --sql
```

## Release Gate

```bash
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
