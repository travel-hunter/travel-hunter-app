# CHECKLIST

## Current Status

- Latest implemented scope: policy-detail trip-link flow now carries the selected policy municipality into `/trips/new`, so the new-trip region step preselects the policy travel area (for example `[영광] ...` -> `영광`).
- Validation date: 2026-06-17.
- Current deployment posture: local fix is validated and ready for development-server deployment; production deployment remains out of scope.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Targeted frontend regression: `cd frontend && npm test -- --run src/app/__tests__/trip-create.test.tsx src/app/__tests__/policies.test.tsx` (`27 passed`).
- Typecheck: `cd frontend && npm run typecheck` passed.
- Full frontend test sweep: `cd frontend && npm test` (`167 passed, 1 failed`). Remaining failure is existing `src/app/__tests__/policy-detail.test.tsx > renders the prototype policy detail section order` expecting `신청 대상` text that is absent from the current rendered policy detail; not in the changed policy-to-trip path.
- UTF-8 replacement-character check for changed frontend files: passed; `git diff --check`: passed.

## Remaining Risks

- Development-server deployment and smoke still need to be recorded after the commit is pushed and rebuilt.
- Production deployment is intentionally not performed for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
