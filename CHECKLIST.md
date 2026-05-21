# Travel Hunter Harness Checklist

## 현재 기준 문서

- [x] Product/current state: `docs/current-work-spec.md`
- [x] Implemented behavior: `docs/implemented-feature-spec.md`
- [x] API contract: `docs/mvp-api-contract.md`
- [x] DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`
- [x] Local runtime: `docs/local-dev-runtime.md`
- [x] Deployment/CICD: `docs/deployment-cicd/README.md`
- [x] Next priority: `docs/next-work-plan.md`
- [x] Collaboration rules: `CONTRIBUTING.md`, `AGENTS.md`

## 현재 보장 조건

- [x] Runtime mock API mode is removed; frontend data access goes through `AppDataApi`.
- [x] User-facing backend behavior is PostgreSQL-backed.
- [x] Policy detail routes use `policySlug` / `policies.slug`.
- [x] Trip routes use internal trip ids; public trip slugs are not introduced.
- [x] API DTO fields stay `camelCase`; DB and SQL fields stay `snake_case`.
- [x] Backend route/schema/service/repository boundaries remain the implementation pattern.
- [x] Schema changes are managed by Alembic, not SQLAlchemy `create_all()`.
- [x] Real `.env` files, DB passwords, OAuth secrets, auth secrets, tunnel tokens, and Docker image archives are not committed.
- [x] Cloudflare Tunnel is the current deployment baseline; Jenkins is still a planned CD path.
- [x] Release readiness criteria live in `docs/deployment-cicd/09-release-checklist.md`.
- [x] `.agent/evals/api-contract-golden.json` remains the machine-readable API contract eval.

## 최근 검증

- 2026-05-19 DB schema docs: `git diff --check`, stale schema-reference search, `python -m pytest tests/test_db_schema.py`, `alembic upgrade head --sql`, and `alembic current` passed.
- 2026-05-19 docs core cleanup: stale deleted-doc reference search and `git diff --check` passed.
- 2026-05-19 backend docs cleanup: stale backend doc/eval reference search and `git diff --check` passed.
- 2026-05-19 frontend docs cleanup: stale frontend README/eval reference search and `git diff --check` passed.
- 2026-05-19 AI docs cleanup: AI/Codex guidance is consolidated in `docs/deployment-cicd/06-ai-workflow.md`; reference search and `git diff --check` passed.
- 2026-05-19 remaining docs cleanup: `CHECKLIST.md`, `PLANS.md`, `README.md`, `.agent` release readiness docs, and release checklist were compacted; removed-doc reference search, `.agent/evals` listing, and `git diff --check` passed.
- 2026-05-19 final verification: frontend `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` passed after updating stale e2e expectations to the current policy CTA, invite, logout, and trip creation flows; backend `python -m pytest tests/test_db_schema.py`, `python -m pytest`, `alembic upgrade head --sql`, compose config checks, and `docker compose -f compose.yaml build` passed.
- 2026-05-19 PR #17 handoff: `feat/prototype-to-react` was pushed to origin, `develop` PR #17 was opened, GitHub Actions frontend/backend fast lanes passed, reviewers were requested, and `compose.tunnel.yaml` actual-env `config --quiet` plus build passed. Full tunnel `up`, migration, and public health smoke were intentionally left for the release window.
- 2026-05-19 deployment hardening: Protected routes now wait for session bootstrap before redirecting, and tunnel compose services use `restart: unless-stopped`; frontend typecheck/test, tunnel compose config checks, tunnel build, and `git diff --check` passed.
- 2026-05-20 branch stabilization: PR #17 merged into `develop` (commit `b5c0557`); PRs #18, #19, #20 subsequently merged; local `develop` pulled to `80c9876`; `git diff --check` passed; doc references verified (all referenced files exist); frontend `npm run typecheck` and `npm run build` passed. Full test suite requires Docker Desktop.
- 2026-05-20 trip alias cleanup: the old non-numeric 제주 3-day trip handle support was removed while keeping the 제주 seed trip data; frontend `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`, backend `python -m pytest`, API eval JSON validation, compose config, `git diff --check`, and stale alias reference search passed.
- 2026-05-20 project status docs refresh: `docs/current-work-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`, and `docs/requirements.md` were updated to the `develop` staging-smoke-ready baseline; scoped stale reference search, API eval JSON validation, and `git diff --check` passed.
- 2026-05-20 release handoff: `docs/deployment-cicd/release-handoff-2026-05-20.md` records the `develop` staging smoke candidate, validation evidence, host-only env inputs, startup commands, and remaining risks.
- 2026-05-20 develop sync: PR #23 merged into `develop` at `9bdcb73`; local `develop` and `origin/develop` are synced.
- 2026-05-20 staging ops work orders: `docs/deployment-cicd/staging-ops-work-orders.md` was added for non-developer external infra/ops handoff, current status docs were updated to the PR #23 baseline, and documentation validation passed with `git diff --check`, targeted reference search, and assigned-secret scan.
- 2026-05-20 meeting brief: `docs/meeting-briefs/travel-hunter-dev-status-2026-05-20.md` was revised into a shareable detailed representative/PM status report with only necessary status, completion, remaining-work, decision, risk, and next-step lists; `git diff --check`, source reference search, and assigned-secret scan passed.
- 2026-05-21 itinerary auto-course validation: branch `codex/itinerary-auto-course` generates itinerary course days from selected region, dates, and course preference through the FastAPI/AppDataApi contract path; backend provider/service checks `python -m pytest tests/test_itinerary_recommendations.py tests/test_trip_db_service.py -q -p no:cacheprovider` passed (37 passed), backend route smoke `python -m pytest tests/test_trip_db_routes.py::test_db_recommendation_and_invite_routes -q -p no:cacheprovider` passed (1 passed), `.agent/evals/api-contract-golden.json` validated with `python -m json.tool`, `docker compose -f compose.yaml config` passed, frontend `npm run typecheck` passed after installing worktree dependencies, and targeted frontend `npm test -- --run src/App.test.tsx -t "uses selected region and dates when creating a trip"` passed with Docker access enabled.

## 남은 우선순위

- [x] Complete review and merge PR #17 into `develop` after the latest checks are green.
- [x] Prepare staging smoke handoff.
- [x] Merge the `chore/develop-release-handoff-2026-05-20` sync PR into `develop`.
- [ ] Run Cloudflare Tunnel full staging smoke during the release window.
- [ ] Verify SMTP delivery in staging.
- [ ] Verify OAuth provider credentials in staging.

## 주의사항

- Historical validation logs, prototype notes, and VPS-era runbook details are intentionally kept only in Git history.
- Documentation-only cleanup does not require frontend/backend test suites unless a code, API, schema, or runtime behavior changes.
- For release handoff, run the release gate in `docs/deployment-cicd/09-release-checklist.md` and record only the final evidence here, in the PR, or in the handoff note.
