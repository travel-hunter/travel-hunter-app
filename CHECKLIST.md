# CHECKLIST

## Current Status

- Latest implemented scope: friend invite management now allows trip members with `owner` **or** `editor` role to access `/friend-invite`, open invite flow, activate/update invite links, and send invite emails; `viewer` remains blocked and reads readonly guidance.
- Validation date: 2026-06-17.
- Current deployment posture: implementation remains local; dev/prod deployment was not performed in this task.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan`, `docs/mvp-api-contract.md`.
- Invite/trip workflow spec: `docs/specs/invite-trip-edit-workflow.md`.

## Latest Validations

- Backend invite-path service tests: `cd backend && ./.venv/bin/python -m pytest tests/test_trip_db_service.py -k 'invite'` (`12 passed`).
- Frontend tests for trip detail and invite OAuth pages: `cd frontend && npm test -- src/app/__tests__/trip-detail.test.tsx src/app/__tests__/invite-oauth.test.tsx -- --run` (`2 test files, 35 passed`).
- Frontend typecheck: `cd frontend && npm run typecheck` (`passed`).
- Docs and code quality quick checks: `git diff --check` and UTF-8/mojibake checks for changed files via test script (no reported issues).

## Remaining Risks

- Remaining unrelated worktree changes (policy/travel-area scope and others) are intentionally left untouched; this invite-scoped commit should be isolated to changed files only.
- No production deploy validation is done for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
