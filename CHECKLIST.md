# CHECKLIST

## Current Status

- Active task: local DB timezone baseline is prepared for merge into `develop` through PR #98.
- Local branch: `agent/local-timezone-guardrails-20260711`, rebuilt from `origin/develop` with only the local timezone guardrail commit applied.
- Remote target: `origin/develop`; direct pushes to protected branches remain blocked by GitHub PR-only rules.
- Development server: last known dev deployment evidence remains the policy cleanup deployment on `develop`; this DB timezone pass has not mutated the dev server, staging, production, or any remote DB.
- Scope boundary: this pass changes local compose/runtime docs, a guarded local-only Alembic data-shift draft, and regression tests only. No production-domain mutation, destructive DB reset/downgrade, live policy fetch, object-storage implementation, raw/source-record deletion, or staging/prod migration was performed.

## Latest Validation Evidence

- Policy cleanup baseline: dev server policy regeneration and 강진 `travelmonth-23` browser/API smoke were previously verified on `develop`; sampled local-half-trip policies avoided the wrong 디지털관광주민증 helper and severe card mixing.
- CI repair baseline: seed invite expiry was extended to `2026-12-31T23:59:59Z`; PR #94 passed Frontend DB-backed and Backend lanes, and dev DB stores `jeju-3d.expires_at=2026-12-31T23:59:59`.
- Backend regression baseline: `backend/.venv/bin/python -m pytest` previously passed on the policy cleanup line (`534 passed, 1 warning`).
- DB timezone local runtime: `compose.yaml` sets local PostgreSQL `timezone=Asia/Seoul`, `log_timezone=Asia/Seoul`, DB `TZ=Asia/Seoul`, and backend `TZ=Asia/Seoul`.
- Guarded migration: `backend/alembic/versions/0024_local_kst_timestamp_data_shift.py` is no-op by default and shifts only the seven approved local operational columns when `TRAVEL_HUNTER_ALLOW_LOCAL_TIMEZONE_DATA_SHIFT=1` passes local/dev/test DB guards.
- Timestamp inventory: `backend/tests/test_timezone_timestamp_inventory.py` uses tracked fixtures under `backend/tests/fixtures/` to keep the 34-column timestamp inventory and adjust/keep/investigate buckets explicit.
- Security/scheduler tests: `backend/tests/test_security_time.py`, `backend/tests/test_notification_scheduler_timezone.py`, and `backend/tests/test_external_collection_scheduler_timezone.py` protect UTC security helpers and KST scheduler due checks.
- 2026-07-11 develop-target verification passed after rebuilding the PR branch from `origin/develop`: `git diff --check`; changed-file UTF-8/no-U+FFFD scan; full backend pytest (`559 passed, 1 warning`); `backend/.venv/bin/alembic upgrade head --sql` with one head `0024_local_kst_time_shift` and 46 timestamp columns; `docker compose -f compose.yaml config`; frontend `npm test` (`21 files`, `214 passed`).

## Remaining Risks

- This DB timezone pass is local-only. It does not prove staging or production runtime behavior, image builds, live service health, or remote DB safety.
- The guarded data shift must not be enabled outside verified local/dev/test DB contexts, and operators must review before/after timestamp counts with a local DB backup before running it online.
- Investigate-bucket timestamp columns remain unshifted until their runtime provenance is proven.
- Some sampled local-half-trip policies may still have source-specific edge wording, so future parser/normalizer fixture work may be needed if operators want stricter document/notice classification.
- Cloudflared has historical QUIC/stream warnings; public tunnel smoke was healthy in the prior dev deployment, but tunnel logs should be monitored if route availability changes.
- Production domain `travel-hunter.co.kr`, object storage/raw artifact externalization, new policy sources, admin UI redesign, and live external collection readiness remain out of scope.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
