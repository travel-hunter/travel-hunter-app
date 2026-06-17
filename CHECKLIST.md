# CHECKLIST

## Current Status

- Latest implemented scope: policy-detail trip-link flow now carries the selected policy municipality into `/trips/new`, and backend travel-area recommendations now synthesize policy-only municipalities such as `영광` when they are not present in the static travel-area catalog.
- Validation date: 2026-06-17.
- Current deployment posture: frontend handoff fix PR #65 is merged to `develop`; backend policy-region travel-area follow-up is verified locally and pending PR/development-server deployment; production deployment remains out of scope.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Targeted frontend regression: `cd frontend && npm test -- --run src/app/__tests__/policies.test.tsx src/app/__tests__/trip-create.test.tsx` (`28 passed`).
- Typecheck: `cd frontend && npm run typecheck` passed.
- Backend policy-region travel-area regression: `cd backend && .venv/bin/python -m pytest tests/test_travel_areas.py` (`13 passed`).
- Development-server diagnosis after PR #65: `GET /api/recommendations/travel-areas?query=영광&limit=20` returned `items: []`, confirming the remaining issue was backend policy-only municipality discovery and dynamic travelAreaId resolution.
- UTF-8 replacement-character check for changed files and `CHECKLIST.md`: passed; `git diff --check` and `git diff --check -- CHECKLIST.md`: passed.
- Development-server deployment smoke: pending after PR/develop sync.

## Remaining Risks

- Production deployment is intentionally not performed for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
