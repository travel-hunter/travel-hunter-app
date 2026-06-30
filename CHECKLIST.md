# CHECKLIST

## Current Status

- Active task: `policies.structured_detail` 기반 사용자 정책 상세 structured JSON 1차 적용 구현과 검증을 완료했다.
- Branch: `develop`; push, PR creation, and merge have not been performed.
- Scope: reversible enhancement. Existing policy fields and fallback rendering remain; raw collection JSON, AI reinterpretation, admin editing, parser overhaul, field removal, and policy list redesign stay out of scope.

## Local Work Summary

- Added Alembic migration `0023_policy_structured_detail` with `policies.structured_detail` JSONB and downgrade.
- Added backend structured-detail builder/normalizer and exposed API DTO field `structuredDetail`.
- Added frontend `Policy.structuredDetail` types and policy detail rendering for non-empty structured sections with existing fallback preserved.
- Updated API contract, API golden eval, DB schema snapshot/docs, ERD docs, and policy collection-to-screen flow docs.
- Regenerated `docs/db-schema-current.sql` from the compose PostgreSQL schema after Alembic migration ran during frontend test setup.

## Latest Validation Evidence

- Backend targeted tests: `cd backend && .venv/bin/python -m pytest tests/test_policy_db_service.py tests/test_policy_normalization.py` PASS (48 passed, 1 warning).
- Full backend suite: `cd backend && .venv/bin/python -m pytest` PASS (531 passed, 1 warning).
- Frontend typecheck: `cd frontend && npm run typecheck` PASS.
- Frontend targeted detail tests: `cd frontend && npm test -- --run src/app/__tests__/policy-detail.test.tsx` PASS (13 passed); setup applied Alembic migration `0023_policy_structured_detail` to compose PostgreSQL first.
- Full frontend suite: `cd frontend && npm test` PASS (21 files, 212 tests).
- Frontend production build: `cd frontend && npm run build` PASS.
- Alembic static SQL: `cd backend && .venv/bin/alembic upgrade head --sql > /tmp/alembic_policy_structured_detail.sql` PASS; SQL includes `ALTER TABLE policies ADD COLUMN structured_detail JSONB` and backfill `UPDATE`.
- Post-review targeted fix verification: `cd backend && .venv/bin/python -m pytest tests/test_policy_db_service.py tests/test_policy_normalization.py tests/test_admin_service.py` PASS (61 passed, 1 warning); `cd frontend && npm run typecheck && npm test -- --run src/app/__tests__/policy-detail.test.tsx` PASS (14 passed); `cd backend && .venv/bin/alembic upgrade head --sql > /tmp/alembic_policy_structured_detail.sql` PASS.
- AI slop cleanup verification: write-time structured link sanitization hardened, test whitespace cleaned; `cd backend && .venv/bin/python -m pytest tests/test_policy_db_service.py tests/test_policy_normalization.py tests/test_admin_service.py` PASS (62 passed, 1 warning); `cd frontend && npm run typecheck` PASS.
- Independent review gate: initial review found unsafe links/fallback/backfill/admin freshness blockers; fixes were applied; final `code-reviewer` recheck APPROVE and final `architect` recheck CLEAR.
- Hygiene: `git diff --check` PASS; changed-file UTF-8/U+FFFD check PASS; untracked text whitespace check PASS.

## Remaining Risks

- `structured_detail` backfill is intentionally loose and does not parse source-specific details deeply.
- Production rollout still needs the normal deployment backup/rollback checklist before applying Alembic to a shared database.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining validation, and risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
