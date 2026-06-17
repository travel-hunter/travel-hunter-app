# CHECKLIST

## Current Status

- Latest implemented scope: policy-detail trip-link flow now carries the selected policy municipality into `/trips/new`, so the new-trip region step preselects the policy travel area (for example `[영광] ...` -> `영광`).
- Validation date: 2026-06-17.
- Current deployment posture: fix branch `fix/policy-trip-region-handoff` is deployed to the development server at app commit `1db1712`; production deployment remains out of scope.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Targeted frontend regression: `cd frontend && npm test -- --run src/app/__tests__/trip-create.test.tsx src/app/__tests__/policies.test.tsx` (`27 passed`).
- Typecheck: `cd frontend && npm run typecheck` passed.
- Full frontend test sweep: `cd frontend && npm test` (`167 passed, 1 failed`). Remaining failure is existing `src/app/__tests__/policy-detail.test.tsx > renders the prototype policy detail section order` expecting `신청 대상` text that is absent from the current rendered policy detail; not in the changed policy-to-trip path.
- UTF-8 replacement-character check for changed frontend files: passed; `git diff --check`: passed.
- Development-server deployment smoke: server `C307-24` reset to `1db1712` from `fix/policy-trip-region-handoff`; `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config`, `build`, `up -d db`, `run --rm backend alembic upgrade head`, and `up -d` completed; backend and DB containers healthy; `https://dev.travel-hunter.co.kr/api/health` returned `{"status":"ok","service":"travel-hunter-backend","environment":"staging","database":"connected"}`; `https://dev.travel-hunter.co.kr/policies/travelmonth-24` returned HTTP 200; `https://dev.travel-hunter.co.kr/trips/new?policySlug=travelmonth-24&region=%EC%98%81%EA%B4%91` returned HTTP 200.

## Remaining Risks

- `develop` is protected by GitHub PR rules, so the development server is temporarily ahead of `origin/develop` at the fix branch commit until the PR branch is merged.
- Production deployment is intentionally not performed for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
