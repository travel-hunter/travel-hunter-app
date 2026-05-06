# Travel Hunter Current Plan

## Current Phase

The MVP feature set and Docker-backed release gate are complete. The current priority is choosing the real staging environment and executing deployment from the Docker Compose release-candidate baseline.

## Baseline

- Frontend: React, TypeScript, Vite, React Router, `AppDataApi`, `VITE_DATA_SOURCE=mock|backend`.
- Backend: FastAPI, SQLAlchemy, Alembic, deterministic mock services, DB-backed auth/profile/policy/trip/invite/saved-policy services.
- Contract: `docs/mvp-api-contract.md`.
- Current implementation spec: `docs/current-work-spec.md`.
- Next implementation priority: `docs/next-work-plan.md`.

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
npm run test:e2e:backend
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
```
