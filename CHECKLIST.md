# Travel Hunter Harness Checklist

## Harness Adoption

- [x] Add root `AGENTS.md` with project rules, source priority, commands, and done criteria.
- [x] Add Claude compatibility pointer in `CLAUDE.md`.
- [x] Add frontend local rules in `frontend/AGENTS.md`.
- [x] Add backend local rules in `backend/AGENTS.md`.
- [x] Add living execution plan in `PLANS.md`.
- [x] Add `.agent/skills` procedures for common workflows.
- [x] Add `.agent/evals` acceptance artifacts.

## Current Work Priorities

- [x] Keep `docs/mvp-api-contract.md`, frontend API types, backend schemas, and tests synchronized for every API change.
- [x] Before PostgreSQL work, confirm the SQLAlchemy/Alembic plan against `../files/travel_hunter_schema_v0.3.sql`.
- [x] Expand backend tests with error/not-found paths when Mock API behavior changes.
- [x] Keep frontend route smoke coverage aligned with real routes.
- [x] Update README and env examples whenever setup or runtime behavior changes.
- [x] Keep `docs/next-work-plan.md` aligned with the current next implementation priority.

## Required Validation

- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm test`
- [x] `cd frontend && npm run test:e2e`
- [x] `cd frontend && npm run build`
- [x] `cd backend && python -m pytest`
- [x] `docker compose -f compose.yaml config`
- [x] `docker compose -f compose.yaml run --rm backend alembic upgrade head`
- [x] `docker compose -f compose.yaml run --rm backend python -m app.db.seed`
- [x] `cd backend && alembic upgrade head --sql`
- [x] DB mode policy endpoint smoke through backend container
- [x] DB mode auth signup/login/me/refresh/logout smoke
- [x] Docker backend image build and auth dependency import smoke

## Last Validation Result

- Status: passed.
- Date: 2026-05-04.
- Results: frontend typecheck passed, Vitest passed 5 tests, Playwright passed 6 tests, frontend build passed, backend pytest passed 26 tests, `BACKEND_DATA_SOURCE=db` backend pytest passed 26 tests, policy missing slug 404 paths passed in mock/db mode, actual DB mode policy missing slug smoke returned 404, auth DB mode login/me/refresh/logout smoke passed, Docker Compose config passed, Docker backend image build passed, backend container auth dependency import smoke passed, Alembic offline SQL rendering passed, compose PostgreSQL was healthy, Alembic migration ran, seed ran twice without duplicate user/policy/trip/invite rows, host `127.0.0.1:55432` migration/seed passed, and DB mode policy list/detail smoke returned the expected contract shape.
- Notes: Host `127.0.0.1:5432` reaches an existing local PostgreSQL instance with different credentials, so compose exposes Travel Hunter PostgreSQL on host `127.0.0.1:55432`. Compose network commands using backend -> db and host `127.0.0.1:55432` direct DB commands are verified.
- Container pytest note: the runtime backend image does not copy `backend/tests`, so `docker compose run backend python -m pytest` is not a valid test command for this image. Use local backend pytest or add a dedicated test image if containerized pytest becomes required.
