# Travel Hunter Harness Checklist

## Current Baseline

- [x] Root and nested `AGENTS.md` rules exist.
- [x] `PLANS.md` tracks the current implementation phase.
- [x] `.agent/skills` procedures exist for recurring workflows.
- [x] `.agent/evals` acceptance artifacts exist.
- [x] `docs/current-work-spec.md` is the current implementation summary.
- [x] `docs/mvp-api-contract.md` is the API contract.
- [x] `docs/next-work-plan.md` is the next-priority plan.
- [x] `docs/db-schema-v0.3.sql` is the ERD v0.3 SQL baseline.

## Current Implementation Checks

- [x] Keep `docs/mvp-api-contract.md`, frontend API types, backend schemas, and tests synchronized for every API change.
- [x] Keep frontend route smoke coverage aligned with real routes.
- [x] Keep mock-mode and backend-mode e2e smoke separate.
- [x] Do not add a `trips.slug` column.
- [x] Return `Trip.id` as `str(trips.id)` in DB mode.
- [x] Use shared trip handle resolver behavior for trip child endpoints.
- [x] Ensure `jeju-3-days` alias does not bypass access checks.
- [x] Persist policy attachment from the frontend trip picker through DB-backed `trip_policies`.
- [x] Send trip creation `region/style/policySlug` payload through frontend and backend contracts.
- [x] Keep `InviteState.copied` as frontend local UI state.
- [x] Persist profile `region/style/budget` through DB-backed `/api/me/profile`.
- [x] Persist invite acceptance through DB-backed `/api/invites/{inviteToken}/accept` and idempotent `trip_members` insertion.
- [x] Keep mock-mode and backend-mode Playwright e2e as separate CI jobs with failure artifacts.
- [x] Persist standalone policy saves through DB-backed `/api/me/saved-policies/{policySlug}` and `user_saved_policies`.
- [x] Document staging env, production build, container validation, and release scorecard criteria.
- [x] Expose `policies.official_url`/`policies.apply_url` as `Policy.officialUrl`/`Policy.applyUrl` and connect policy detail CTAs to external links when available.
- [x] Remove completed legacy planning documents after absorbing live information into current docs.
- [x] Ensure deleted legacy document filenames are not referenced by active docs.

## Required Validation

- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm test`
- [x] `cd frontend && npm run test:e2e`
- [ ] `cd frontend && npm run test:e2e:backend` (blocked: Docker Desktop daemon unavailable)
- [x] `cd frontend && npm run build`
- [x] `cd backend && python -m pytest`
- [x] `cd backend && alembic upgrade head --sql`
- [x] `docker compose -f compose.yaml config`
- [ ] `docker compose -f compose.yaml build` (blocked: Docker Desktop daemon unavailable)
- [x] `git diff --check`
- [x] `.agent/evals/api-contract-golden.json` JSON parse
- [ ] `docker compose -f compose.yaml run --rm backend alembic upgrade head` (blocked: Docker Desktop daemon unavailable)
- [ ] `docker compose -f compose.yaml run --rm backend python -m app.db.seed` (blocked: Docker Desktop daemon unavailable)

## Last Validation Result

- Status: partial pass with environment blocker.
- Date: 2026-05-06.
- Results: frontend typecheck passed, Vitest passed 9 tests, Playwright mock-mode passed 6 tests, frontend build passed, backend pytest passed 62 tests, Alembic offline SQL rendering passed, Docker Compose config passed, API contract golden JSON parsed successfully, and `git diff --check` passed.
- Blocked: `npm run test:e2e:backend`, `docker compose -f compose.yaml build`, and compose DB runtime migration/seed validation are blocked because Docker Desktop daemon is unavailable in the current local session. The commands fail before app code runs with Docker API connection errors.
- Notes: Compose exposes Travel Hunter PostgreSQL on host `127.0.0.1:55432` because host `127.0.0.1:5432` reaches another local PostgreSQL instance. The runtime backend image does not copy `backend/tests`; use local backend pytest unless a dedicated test image is added.

## Next Priority

- [ ] Start Docker Desktop, rerun backend-mode e2e/container validation, and update the release scorecard.
