# CHECKLIST

## Current Status

- Active task: `/home` weekly benefit card condition fix from `.omx/specs/deep-interview-home-weekly-benefit-condition-fix.md`.
- Current branch: `fix/home-weekly-condition` from `origin/develop`.
- Scope: root-cause cleanup for local-half-trip policy requirements plus Home card condition display; no API DTO expansion.
- Deployment rule: local verification → GitHub PR/merge → dev server sync/rebuild from merged `origin/develop` only.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Frontend rules: `frontend/AGENTS.md`.
- Task spec: `.omx/specs/deep-interview-home-weekly-benefit-condition-fix.md`.

## Latest Validation Evidence

- Backend targeted normalization tests: `cd backend && .venv/bin/python -m pytest tests/test_policy_normalization.py -q` PASS (19 tests, 1 existing warning).
- Frontend targeted Home tests: `cd frontend && npm run test -- --run src/app/__tests__/home.test.tsx` PASS (11 tests, mojibake check PASS).

## Remaining Risks

- Full frontend/backend validation, build, PR CI, and dev-server smoke still pending.
- Dev DB repair requires running the merged normalization/backfill path after deployment; do not hot-edit dev DB manually.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
