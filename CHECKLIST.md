# CHECKLIST

## Current Status

- Latest implemented scope: policy-detail trip-link flow now carries the selected policy municipality into `/trips/new`, including both bracketed policy titles (`[영광] ...`) and digital resident policy titles (`영광 디지털관광주민증 혜택`), so the new-trip region step preselects the policy travel area.
- Validation date: 2026-06-17.
- Current deployment posture: local fix is verified and pending PR/development-server deployment; production deployment remains out of scope.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Targeted frontend regression: `cd frontend && npm test -- --run src/app/__tests__/policies.test.tsx src/app/__tests__/trip-create.test.tsx` (`28 passed`).
- Typecheck: `cd frontend && npm run typecheck` passed.
- Real local backend check: `GET /api/recommendations/travel-areas?query=영광&limit=20` returns a single `영광` travel area, confirming the issue was the policy-to-new-trip query handoff for non-bracketed local policy titles.
- UTF-8 replacement-character check for changed frontend files and `CHECKLIST.md`: passed; `git diff --check` and `git diff --check -- CHECKLIST.md`: passed.
- Development-server deployment smoke: pending after PR/develop sync.

## Remaining Risks

- Production deployment is intentionally not performed for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
