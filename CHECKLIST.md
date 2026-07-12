# CHECKLIST

## Current Status

- Active task/status: Ultragoal G007 final auth lifecycle review blockers resolved.
- Scope guard: Changes were limited to the requested withdrawal UI disclosure and explicit-null withdrawal payload rejection.

## Latest Validation Evidence

- Backend targeted tests: `cd backend && .venv/bin/python -m pytest tests/test_auth_db_service.py tests/test_auth_edge_cases.py` passed: 55 passed.
- Frontend targeted tests: `cd frontend && npx vitest run src/app/__tests__/mypage.test.tsx` passed: 1 file passed, 20 tests passed.
- Diff/encoding checks for the G007 touched files passed: `git diff --check -- ...` and strict UTF-8/U+FFFD scan.

## Remaining Risks

- Full frontend suite/E2E and full backend suite were not rerun after the G007 review-blocker fixes.
- Fresh PostgreSQL `pg_dump` regeneration was not performed; `docs/db-schema-current.sql` remains a schema reference updated from Alembic 0026 SQL evidence.
- Worktree still contains implementation changes from other agents; they were not reverted or edited.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
