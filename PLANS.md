# Travel Hunter Current Plan

## Task

Keep the Mock API contract stable while moving from DB-backed policy/auth/trip foundations into frontend actions that persist through the backend.

## Current Baseline

- Frontend: React, TypeScript, Vite, React Router, `AppDataApi`, `VITE_DATA_SOURCE=mock|backend`.
- Backend: FastAPI, Pydantic schemas, Mock API route/service/data layers, SQLAlchemy models, Alembic v0.3 migration, development seed command, DB-backed policy/auth/trip repository/service boundaries.
- Contract: `docs/mvp-api-contract.md`.
- Current work spec: `docs/current-work-spec.md`.
- Next work plan: `docs/next-work-plan.md`.
- ERD input: `../files/travel_hunter_schema_v0.3.sql` and related v0.3 ERD notes.
- Repo DB baseline: `docs/db-schema-v0.3.sql`.

## Milestones

1. Keep the current Mock API shape synchronized across backend schemas, frontend types, tests, and evals.
2. Ensure route-level smoke coverage stays valid for public, protected, and authenticated flows.
3. Keep Mock API deterministic while adding DB-backed services behind `BACKEND_DATA_SOURCE=mock|db`.
4. Use Alembic only for schema creation; never use SQLAlchemy `create_all()` for app schema.
5. Update README/env docs whenever setup, commands, environment variables, or API usage changes.
6. Run release readiness validation before handoff.
7. Keep `docs/next-work-plan.md` aligned with the next concrete implementation priority.
8. Keep mock-mode and backend-mode frontend e2e smoke commands separate so failures identify the broken layer quickly.

## Known Risks

- The worktree currently contains many existing modified, deleted, and untracked files. Do not revert or normalize unrelated files.
- Mock trip id `jeju-3-days` is temporary and exists for frontend compatibility. DB-backed trip endpoints return numeric string ids, accept `jeju-3-days` only as a legacy seed alias, and fail closed when the alias maps to zero or multiple accessible trips.
- Canonical numeric trip handles must match `^[1-9][0-9]*$`; do not treat `0` or `001` as DB id values.
- `match`, `expectedSaving`, `copied`, and `invited` are calculated/API/UI-state values, not direct DB source fields.
- Auth DB-backed mode requires a Bearer access token for `/api/me`; Mock mode must keep the old unauthenticated smoke behavior.
- Docker daemon availability may vary locally. If compose build cannot run, record the blocker and at least run `docker compose -f compose.yaml config`.

## Verification

Run these before calling release readiness complete:

```bash
cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:backend
npm run build

cd ../backend
python -m pytest

cd ..
docker compose -f compose.yaml config
```

Run these when PostgreSQL is available through Compose:

```bash
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

## Deliverables For Each Work Item

- Files changed.
- Contract or eval changes, if any.
- Validation commands and results.
- Remaining risks or explicit "none".
