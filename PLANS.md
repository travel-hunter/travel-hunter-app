# Travel Hunter Current Plan

## Current Phase

The MVP feature set is implemented and runtime mock mode has been removed. The current priority is validating the DB-backed-only baseline, then choosing the real staging environment and executing deployment from the Docker Compose release-candidate baseline.

## Source Of Truth

- Current implementation spec: `docs/current-work-spec.md`
- Release candidate handoff: `docs/release-candidate-handoff.md`
- API contract: `docs/mvp-api-contract.md`
- Next priority: `docs/next-work-plan.md`
- Future deployment notes: `docs/future-deployment.md`

## Next Milestones

1. Choose the real staging environment and execute deployment from the Docker Compose release-candidate baseline.

## Guardrails

- Do not add `trips.slug`.
- Keep DB mode `Trip.id` as `str(trips.id)`.
- Keep `jeju-3-days` as legacy seed alias only.
- Keep API DTO fields `camelCase` and DB fields `snake_case`.
- Keep frontend pages behind the `AppDataApi` boundary.
- Keep backend routes thin and push business behavior into services.
- Update API contract, backend schema, frontend type, and focused tests for API shape changes.

## Fast Lane Verification

Run during feature work:

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

Run before release candidate handoff:

```bash
cd frontend
npm run test:e2e
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```
