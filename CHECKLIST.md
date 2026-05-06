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
- [x] Keep mock-mode and backend-mode e2e smoke as release-gate validation, not daily blockers.
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
- [x] Show saved policies on My Page and support DB-backed saved-policy removal.
- [x] Document staging env, production build, container validation, and release scorecard criteria.
- [x] Expose `policies.official_url`/`policies.apply_url` as `Policy.officialUrl`/`Policy.applyUrl` and connect policy detail CTAs to external links when available.
- [x] Build `/invites/:inviteToken/accept` so shared invite links can route through login, accept, and move to the joined trip.
- [x] Support policy list search, region filters, and category filters without changing the API shape.
- [x] Refine policy `officialUrl`/`applyUrl` seed data to verified official links and nullable application deep links.
- [x] Remove completed legacy planning documents after absorbing live information into current docs.
- [x] Ensure deleted legacy document filenames are not referenced by active docs.

## Required Validation

- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm test`
- [x] `cd backend && python -m pytest`
- [x] `git diff --check`

## Release Gate Validation

- [x] `cd frontend && npm run test:e2e`
- [x] `cd frontend && npm run test:e2e:backend`
- [x] `cd frontend && npm run build`
- [x] `docker compose -f compose.yaml config`
- [x] `docker compose -f compose.yaml build`
- [x] `docker compose -f compose.yaml run --rm backend alembic upgrade head`
- [x] `docker compose -f compose.yaml run --rm backend python -m app.db.seed`

## Last Validation Result

- Status: release gate passed.
- Date: 2026-05-06.
- Results: frontend typecheck passed, Vitest passed 16 tests, backend pytest passed 68 tests, mock Playwright e2e passed 6 tests, backend-mode Playwright e2e passed 5 tests, frontend build passed, compose config passed, compose build passed, compose DB migration passed, compose seed passed twice, and `git diff --check` passed.
- Note: `frontend/scripts/run-backend-e2e.cjs` now waits for PostgreSQL readiness before running Alembic so the Docker-backed e2e path does not race the DB startup.

## Next Priority

- [ ] Prepare release candidate handoff and choose the staging/deployment target.
