# CHECKLIST

## Current Status

- Latest validated scope: email-first signup merge into `develop`, including pending signup storage, signup verification/complete API contract, frontend signup/verify flow, invite redirect after signup, onboarding redirect helpers, and preservation of develop admin/external-source/trip-revision work.
- Last validation date: 2026-06-15.
- Current release posture: local backend pytest, Alembic offline SQL, frontend typecheck/unit/build/e2e, compose config, API golden JSON parse, whitespace checks, and UTF-8 file scan are validated on `merge/email-first-to-develop` before pushing to `origin/develop`. Existing PR #53 remains a separate draft PR to `main`.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history or source-specific docs.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`.
- Invite/trip workflow spec: `docs/specs/invite-trip-edit-workflow.md` via `docs/specs/spec-index.md`.
- Screen and logic status: `docs/screen-feature-status-screens.md`, `docs/screen-feature-status-logic.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and linked deployment guides.

## Latest Validations

- 2026-06-15 develop merge pre-push validation passed: `cd backend && .venv/bin/python -m pytest` → 463 passed / 1 warning; `cd backend && .venv/bin/alembic upgrade head --sql >/tmp/travel-hunter-develop-alembic.sql` → passed with linear `0018_add_trip_revision -> 0019_email_first_signup`; `cd frontend && npm test` → 18 files / 162 tests passed; `cd frontend && npm run typecheck` → passed; `cd frontend && npm run build` → passed; `cd frontend && npm run test:e2e` → 10 Playwright backend-mode tests passed; `docker compose -f compose.yaml config >/tmp/travel-hunter-compose.yaml` → passed; `git diff --check --cached`, `git diff --check`, and `python3 -m json.tool .agent/evals/api-contract-golden.json >/dev/null` → passed.
- 2026-06-15 targeted email-first regression validation passed before full suite: backend auth/schema subset `tests/test_auth_db_service.py tests/test_auth_db_routes.py tests/test_auth_edge_cases.py tests/test_db_schema.py` → 63 passed / 1 warning; frontend invite signup redirect test file `npm test -- src/app/__tests__/invite-oauth.test.tsx` → 21 passed.
- 2026-06-15 merge safety checks passed: feature commit `f37b483` was not an ancestor of `origin/develop` before merge; merge branch was created from `origin/develop` to avoid pushing local `develop` commit `fdb4e60`; no unresolved conflict files remained before validation.

## Remaining Risks

- Real SMTP signup verification inbox delivery still needs a development-server/runtime smoke with actual SMTP credentials; do not print or commit those credentials.
- Real OAuth provider callback browser checks and domain-dependent provider checks remain separate release gates.
- Development-server deployment still depends on valid SSH origin host/auth; previous dev-domain health checks returned 502 before redeploy.
- `docs/db-schema-current.sql` was manually reconciled during merge rather than regenerated from pg_dump; Alembic offline SQL and schema tests passed, but regenerate from a live migrated DB before a schema-doc-only release gate if exact dump fidelity is required.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
