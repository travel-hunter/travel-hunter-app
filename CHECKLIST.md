# CHECKLIST

## Current Status

- Active task/status: Post-fix ai-slop cleanup recheck for policy URL safety and policy detail repository fallback removal.
- Scope guard: Backend-only semantic/service/test rework; no DB schema or API DTO key change.

## Latest Validation Evidence

- Post-fix focused backend tests: `cd backend && .venv/bin/python -m pytest tests/test_policy_semantics.py tests/test_policy_db_service.py tests/test_policy_error_paths.py tests/test_trip_db_service.py` passed: 146 passed, 1 warning.
- Python compile check over changed backend policy/trip/audit modules and focused tests passed.
- Fallback scan: focused policy service/structured-detail/semantic/test files have no `AttributeError` or `except AttributeError` matches.
- Diff/encoding checks: `git diff --check` passed; `git diff --check -- CHECKLIST.md` passed; UTF-8 strict read plus U+FFFD scan over 19 changed files passed.

## Remaining Risks

- Phase-2 schema cleanup remains separate: benefit amount/detail consolidation, `target_condition` rename, and link/canonical-key/status model decisions still need their own planning and validation.
- Full backend suite, frontend checks, Alembic SQL, audit JSON, compose config, and broad diff/UTF-8 gates were reported as passed after the rework and were not rerun in this narrow post-fix cleanup recheck. E2E remains a separate running gate.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
