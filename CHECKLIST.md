# CHECKLIST

## Current Status

- Latest validated scope: policy collection local expansion: 숙박세일 페스타 `stay_discount` ingestion, 대한민국 반값여행 status parsing hardening, 여행가는 달 collection continuity, deterministic trip-policy recommendation matching, and previously completed trip conflict + invite email/local fallback work.
- Last validation date: 2026-06-11.
- Current release posture: local backend, frontend type/build, Docker-backed frontend unit flow, Docker-backed Playwright e2e, local SMTP-misconfigured fallback behavior, PR #50 merge, and `develop` push CI are validated. Development-server runtime deploy is blocked on SSH origin target/access; current dev-domain health still returns 502 before redeploy. Real SMTP inbox delivery and public production smoke remain runtime checks.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history or source-specific docs.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`.
- Invite/trip workflow spec: `docs/specs/invite-trip-edit-workflow.md` via `docs/specs/spec-index.md`.
- Screen and logic status: `docs/screen-feature-status-screens.md`, `docs/screen-feature-status-logic.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and linked deployment guides.
- Current conflict-plan artifacts: `.omx/context/trip-edit-conflict-20260611T051304Z.md`, `.omx/plans/prd-trip-edit-conflict-20260611.md`, `.omx/plans/test-spec-trip-edit-conflict-20260611.md`, `.omx/plans/ralplan-consensus-trip-edit-conflict-20260611.md`.
- Policy collection expansion review artifact: `docs/specs/policy-collection-local-expansion-review.md`; approved plan artifacts: `.omx/plans/prd-policy-collection-local-expansion-20260611.md`, `.omx/plans/test-spec-policy-collection-local-expansion-20260611.md`, `.omx/plans/ralplan-consensus-policy-collection-local-expansion-20260611.json`.

## Latest Validations

- 2026-06-11 dev-server deploy continuation: target SHA `7b7abd4e1a42de33f88069a69b2720d75a4fdd15` is published through PR #50 and merged to `develop` as `0f392c4a503c4e3a9fa89d32228e866a5f3cf6c6`; direct `develop` push was blocked by repository rule GH013, PR #50 CI passed, and post-merge `develop` push CI passed frontend/backend fast lanes. Preflight secret assignment scan on `origin/develop..HEAD` before PR branch push returned no high-confidence hits; `docker compose -f compose.yaml config --quiet` and `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config --quiet` passed. `dev.travel-hunter.co.kr` still resolves through Cloudflare but `/api/health`, `/login`, and `/policies` return HTTP 502 before server redeploy; SSH TCP probe to `dev.travel-hunter.co.kr:22` times out. Evidence: `.omx/evidence/dev-server-local-preflight-20260611.md`, `.omx/evidence/dev-domain-predeploy-health-20260611.md`, `.omx/evidence/dev-server-continuation-20260611.md`, `.omx/evidence/dev-server-ssh-network-probe-20260611.md`, `.omx/evidence/dev-server-pr-merge-ci-20260611.md`.
- 2026-06-11 source availability update validation passed: `cd backend && .venv/bin/python -m pytest tests/test_external_benefit_collection.py tests/test_travelmonth_collection.py tests/test_travelmonth_live_collector.py tests/test_travelmonth_parser.py tests/test_ops_routes.py tests/test_policy_normalization.py tests/test_external_source_repository.py tests/test_region_recommendations.py -q` → 59 passed / 1 warning; `cd backend && .venv/bin/python -m pytest -q` → 455 passed / 1 warning; live DB-free parser smoke fetched current official URLs and parsed `regional_benefit` 16 / `stay_discount` 1 / `local_half_trip` 16 records; `uvx ruff check backend/app/services/travelmonth_parser.py backend/tests/test_travelmonth_parser.py` → passed; `cd backend && .venv/bin/python -m compileall -q app tests` and `cd backend && .venv/bin/alembic upgrade head --sql` → passed; `npm --prefix frontend run typecheck` and `npm --prefix frontend run build` → passed; `python3 -m json.tool .agent/evals/api-contract-golden.json`, `git diff --check`, `git diff --check -- CHECKLIST.md`, and UTF-8 text scan → passed.
- 2026-06-11 backend full validation passed after policy collection local expansion cleanup: `cd backend && .venv/bin/python -m pytest -q` → 448 passed / 1 warning.
- 2026-06-11 backend targeted policy expansion validation passed: `uv run --with-requirements requirements.txt --directory backend python -m pytest tests/test_external_benefit_collection.py tests/test_travelmonth_parser.py tests/test_travelmonth_traffic_parser.py tests/test_travelmonth_collection.py tests/test_policy_normalization.py tests/test_policy_category_classifier.py tests/test_external_source_repository.py tests/test_ops_routes.py tests/test_region_recommendations.py tests/test_region_recommendation_routes.py tests/test_trip_db_service.py tests/test_travelmonth_stay_parser.py tests/test_dgtourcard_parser.py tests/test_admin_routes.py -q` → 128 passed / 1 warning.
- 2026-06-11 frontend type/build validation passed after policy collection local expansion: `npm --prefix frontend run typecheck` exited 0; `npm --prefix frontend run build` exited 0.
- 2026-06-11 Alembic SQL validation passed: `cd backend && .venv/bin/alembic upgrade head --sql` exited 0 and emitted `ALTER TABLE trips ADD COLUMN revision INTEGER DEFAULT 1 NOT NULL;`.
- 2026-06-11 cleanup regression validation passed: `uv run --with-requirements requirements.txt --directory backend python -m pytest tests/test_travelmonth_stay_parser.py tests/test_dgtourcard_parser.py tests/test_external_benefit_collection.py tests/test_external_source_repository.py tests/test_policy_normalization.py tests/test_policy_category_classifier.py tests/test_trip_db_service.py -q` → 99 passed / 1 warning.
- 2026-06-11 contract/hygiene validation passed after cleanup: `python3 -m json.tool .agent/evals/api-contract-golden.json >/dev/null`; `git diff --check`; `git diff --check -- CHECKLIST.md`; source/doc UTF-8 replacement scan → all passed.

## Remaining Risks

- Development-server deployment cannot proceed until an SSH origin host/alias/address and approved auth path are available; no `~/.ssh/config` entry or repo-documented host was found locally, and `dev.travel-hunter.co.kr:22` probes time out against Cloudflare edge IPs.
- Real SMTP invite inbox delivery still needs a development-server/runtime smoke with actual SMTP credentials; do not print or commit those credentials.
- Production/public smoke, real OAuth callback browser checks, and domain-dependent provider checks remain separate release gates.
- Policy collection manual-run endpoint/dashboard performs live official-site fetches, so production/dev smoke still needs approved admin bearer auth and should record outcome without exposing tokens.
- Itinerary conflict handling is optimistic stale-save detection only. Trip status conflict handling and policy link/unlink conflict handling remain future scope.
- Default frontend test file-parallel mode can expose existing cross-file state flakiness; use `--no-file-parallelism` for reliable Docker-backed full validation until test isolation is improved.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
