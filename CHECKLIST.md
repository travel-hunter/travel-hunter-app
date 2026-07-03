# CHECKLIST

## Current Status

- Active task: Policy collection cleanup ultragoal completed via deep-interview -> ralplan -> ultragoal; previous DB column/recovery evidence remains below.
- Local branch: `develop`; local worktree contains documentation/checklist updates for the recovery evidence.
- Development server: `deploy@192.168.32.15:/home/deploy/travelhunterapp`, clean `develop@a6140e2` tracking `origin/develop`.
- Runtime: `compose.tunnel.yaml` stack is running with `db`, `backend`, `frontend`, `caddy`, and `cloudflared`; production domain changes were not performed.

## Work Summary

- Completed deep-interview and ralplan consensus planning for policy collection cleanup; planning artifacts live under `.omx/specs/` and `.omx/plans/`.
- Started ultragoal execution and completed the G001 documentation/contract pass: `structuredDetail` is now documented as the primary screen-ready contract for collected policy details, with section-by-section fallback only for missing/empty sections.
- Completed G002 frontend fallback guard: `방문` alone no longer creates a 디지털관광주민증 helper or applicant-target card in legacy requirements fallback.
- Completed G003 backend normalization: `local_half_trip` promotion now builds semantic `structuredDetail.conditions/documents/notices` for 강진-style combined raw detail while preserving the legacy `target_condition` fallback.
- Completed G004 compatibility verification: no public DTO field/route shape change was introduced; `policySlug`, active/hidden promotion, saved policies, and trip-policy attachment behavior remain covered by existing tests.
- Completed G005 documentation and implementation-quality pass: collection responsibility split is documented as DB-backed short term with a future raw artifact pointer seam; final quality gate is awaiting independent re-review only.
- Rechecked local/server drift and confirmed the blocker was deployment-shape drift, not a frontend/backend build failure.
- Created server backup metadata under `/home/deploy/.travel-hunter-recovery/20260702T050921Z-pre-tunnel-restore` without printing secrets.
- Switched server repo from local `master@a6140e2` to `develop@a6140e2` tracking `origin/develop`.
- Restored server-only `deploy/.env.prod` from the latest recovery env with `600` permissions.
- Built `compose.tunnel.yaml`, aligned the DB user password to the restored `DATABASE_URL` without printing secrets, ran Alembic, seeded the empty dev DB, and started the tunnel stack.
- Updated `docs/deployment-cicd/09-release-checklist.md` to reflect the current dev-server hostname/path/SHA/recovery evidence.
- Added `docs/deployment-cicd/2026-07-02-dev-server-recovery-report.md` as a cross-team recovery report covering the pre-policy-collection incident, cause, fix, validation, and remaining risks.
- Added `docs/db-column-report.md` as a human-readable report covering all 22 current DB tables and 232 columns with purpose, relationships, column meanings, and cleanup-priority judgments.

## Latest Validation Evidence

- Ralplan planning validation PASS: Architect review reached APPROVE after one iteration, Critic review APPROVE, and `.omx/plans/ralplan-consensus-policy-collection-cleanup-20260702.json` records `ralplan_consensus_gate.complete=true`.
- Planning diff validation PASS: `git diff --check` passed for the generated `.omx` planning artifacts.
- G001 contract validation PASS: `docs/mvp-api-contract.md` and `docs/policy-collection-to-screen-flow.md` now align on `structuredDetail` precedence, conservative fallback, and no frontend re-inference of provided structured sections.
- G002 frontend validation PASS: added a policy detail regression for `[강진] 대한민국 반값여행 지원`; RED failed on the old 디지털관광주민증 helper, then `cd frontend && npm test -- --run src/app/__tests__/policy-detail.test.tsx` PASS (15 passed) and `cd frontend && npm run typecheck` PASS.
- G003 backend validation PASS: added a 강진 local-half-trip normalization regression; RED failed on collapsed `structured_detail.conditions`, then `cd backend && .venv/bin/python -m pytest tests/test_policy_normalization.py` PASS (22 passed, 1 warning).
- G004 compatibility validation PASS: `cd backend && .venv/bin/python -m pytest tests/test_policy_normalization.py tests/test_policy_db_service.py tests/test_trip_db_routes.py` PASS (79 passed, 1 warning); `cd frontend && npm test -- --run src/app/__tests__/policy-detail.test.tsx` PASS (15 passed).
- G005 blocker-fix validation PASS: after independent review found backend source-record/frontend section-fallback blockers and then WATCHed regex/legacy-boundary clarity, added regressions plus a source-specific local_half_trip rule map/legacy-fallback boundary comments and reran `cd backend && .venv/bin/python -m pytest tests/test_policy_normalization.py tests/test_policy_db_service.py tests/test_trip_db_routes.py` PASS (80 passed, 1 warning), `cd frontend && npm run typecheck` PASS, `cd frontend && npm test -- --run src/app/__tests__/policy-detail.test.tsx` PASS (16 passed), UTF-8/U+FFFD scan PASS for 7 files, and `git diff --check` PASS for changed policy-cleanup files.
- G005 final quality gate PASS: `.omx/reports/policy-collection-cleanup-quality-gate-20260702.json` validates ai-slop cleanup, verification, architecture invariants, independent code-reviewer APPROVE, and independent architect CLEAR; `omx ultragoal checkpoint` marked G005 complete and `omx ultragoal status` reports 5/5 stories complete with `artifactComplete=true`.
- Pre-fix public failure: `https://dev.travel-hunter.co.kr/`, `/api/health`, and `/login` returned Cloudflare 530.
- Server build: `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build` PASS; frontend ran `npm run typecheck && vite build`.
- DB migration: `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend alembic upgrade head` PASS after non-destructive DB password alignment.
- Seed: `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend python -m app.db.seed` PASS; counts after seed were users=3, policies=16, trips=1.
- Public smoke PASS: `/` 200 HTML, `/login` 200 HTML, `/api/health` 200 with `database=connected`.
- Auth/API smoke PASS: `POST /api/auth/login` with seed account, `GET /api/policies`, policy detail, `GET /api/trips`, and trip detail all returned 200 with expected data.
- SPA route smoke PASS: `/home`, `/policies`, one policy detail route, `/trips`, and one trip detail route returned 200 HTML.
- Runtime status: `db` and `backend` healthy; `frontend`, `caddy`, and `cloudflared` running; cloudflared registered tunnel for `dev.travel-hunter.co.kr`.
- Log check: no repeated backend/caddy/cloudflared error loop; cloudflared only reports the known UDP receive-buffer warning.

- Manual policy collection: ran backend live external benefit collection once on the development server without printing secrets; outcome=`success`, parsed=33, createdOrUpdated=33. Source results: regional_benefit success 16, local_half_trip success 16, stay_discount success 1, optional traffic_benefit source_unavailable 0.
- Collection DB verification: external_source_records=33, active_external_source_records=21, policies_total=23, external_policies=23, active_policies=7; backend logs showed no traceback/exception/fatal entries after collection.
- Authenticated policy API verification after collection: seed login PASS and `GET /api/policies` returned 200 with 91 policies.
- Documentation validation PASS: recovery report added; `git diff --check` and UTF-8 no-U+FFFD checks passed for changed docs/checklist.
- DB column report validation: generated from `docs/db-schema-current.sql` and cross-checked against schema docs; report includes 22 tables and 232 columns.

## Remaining Risks

- Policy collection cleanup final quality gate passed: G001-G005 are complete, final code-reviewer recommendation APPROVE, architect status CLEAR, and ultragoal G005 checkpoint was recorded. Changes are local and not merged/deployed.
- The local-half-trip semantic splitter is intentionally conservative and regex-based; future source variants may need parser-specific field extraction before object-storage artifact work.
- Raw artifact externalization is documented as a future seam only; no object storage, artifact metadata migration, or production live collection rerun was introduced in this pass.
- Local `develop@3fa274e` remains one commit ahead of `origin/develop`; it was not deployed to the dev server.
- The dev DB used by the current `/home/deploy/travelhunterapp` compose project was empty before seed; older stopped `travel-hunter-app_*` containers and `travel-hunter-app_travelhunter-db` volume still exist and were not deleted.
- `deploy/.env.prod` was restored from recovery material; values were not printed, but future secret rotation may still be desirable.
- Cloudflared logs a UDP receive-buffer warning; tunnel connectivity and public smoke passed despite it.
- Optional provider smoke remains deferred: Google/Kakao OAuth, SMTP inbox, Kakao Maps/Local, admin bearer-token route smoke, and full e2e.
- Production domain `travel-hunter.co.kr` changes remain out of scope.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining validation, and risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
