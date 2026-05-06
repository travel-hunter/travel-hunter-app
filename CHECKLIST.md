# Travel Hunter Harness Checklist

## Current Baseline

- [x] Root and nested `AGENTS.md` rules exist.
- [x] `PLANS.md` tracks the current implementation phase.
- [x] `.agent/skills` procedures exist for recurring workflows.
- [x] `.agent/evals` acceptance artifacts exist.
- [x] `docs/current-work-spec.md` is the current implementation summary.
- [x] `docs/release-candidate-handoff.md` is the MVP release-candidate handoff guide.
- [x] `docs/deployment-vps.md` is the Docker VPS staging deployment plan.
- [x] `docs/mvp-api-contract.md` is the API contract.
- [x] `docs/next-work-plan.md` is the next-priority plan.
- [x] `docs/db-schema-v0.3.sql` is the ERD v0.3 SQL baseline.
- [x] `docs/future-deployment.md` preserves later AWS/Terraform/EKS expansion notes.
- [x] `CONTRIBUTING.md` documents collaboration rules.
- [x] `docs/collaboration-handoff.md` documents the collaboration handoff.
- [x] GitHub PR and issue templates exist.

## Current Implementation Checks

- [x] MVP user flows are documented in `docs/current-work-spec.md`.
- [x] API shape is documented in `docs/mvp-api-contract.md`.
- [x] Release candidate run modes and evidence are documented in `docs/release-candidate-handoff.md`.
- [x] Completed legacy planning and placeholder infrastructure notes are absorbed into current docs.
- [x] VPS deployment artifacts exist: `compose.vps.yaml`, `deploy/Caddyfile`, and `deploy/.env.staging.example`.

## Required Validation

- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm test`
- [x] `cd backend && python -m pytest`
- [x] `git diff --check`

## Release Gate Validation

- [x] `cd frontend && npm run test:e2e`
- [x] `cd frontend && npm run build`
- [x] `docker compose -f compose.yaml config`
- [x] `docker compose -f compose.yaml build`
- [x] `docker compose -f compose.yaml run --rm backend alembic upgrade head`
- [x] `docker compose -f compose.yaml run --rm backend python -m app.db.seed`
- [x] `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`

## Last Validation Result

- Status: release gate passed.
- Date: 2026-05-06.
- Results: frontend typecheck passed, DB-backed Vitest passed 20 tests, backend pytest passed 72 tests, DB-backed Playwright e2e passed 5 tests, frontend build passed, Alembic offline SQL passed, local compose config/build passed, and VPS compose config passed.
- Note: runtime mock mode has been removed. `npm test` and `npm run test:e2e` start compose PostgreSQL, run Alembic/seed, and execute against FastAPI.

## Next Priority

- [x] Choose Docker VPS as the real staging environment.
- [ ] Provide VPS SSH access, staging domain/DNS, repo clone access, and real staging env values.
- [ ] Execute Docker VPS staging deployment from the release-candidate baseline.
- [ ] Run the internal-test smoke checklist on the external staging URL.
