# Travel Hunter Current Plan

## Current Phase

The MVP is DB-backed-only and runtime mock mode has been removed. Cloudflare Tunnel is the current deployment baseline, while Jenkins CD is still planned. The current priority is to keep the `develop` branch contract clean, then move to staging smoke work when real SMTP, OAuth, Cloudflare, and production env values are ready.

## Source Of Truth

- Current implementation spec: `docs/current-work-spec.md`
- Implemented feature spec: `docs/implemented-feature-spec.md`
- API contract: `docs/mvp-api-contract.md`
- Current DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`
- Next priority: `docs/next-work-plan.md`
- Deployment/CICD: `docs/deployment-cicd/README.md`

## Guardrails

- Do not add `trips.slug`.
- Keep DB mode `Trip.id` as `str(trips.id)`.
- Keep trip route handles numeric string ids only.
- Keep API DTO fields `camelCase` and DB fields `snake_case`.
- Keep frontend pages behind the `AppDataApi` boundary.
- Keep backend routes thin and push business behavior into services.
- Do not reintroduce runtime mock mode.
- Do not commit real `.env` files, tunnel tokens, DB passwords, Kakao secrets, or auth secrets.

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
