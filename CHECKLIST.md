# CHECKLIST

## Current Status

- Latest implemented scope: `/ai-results` candidate/source badge cleanup removes the `ai-source-chip` UI from the selected-candidate summary and candidate cards, including the unused source-label helper and CSS.
- Validation date: 2026-06-17.
- Current deployment posture: local `develop` source has the UI cleanup; production deployment remains out of scope until the change is pushed/merged and the development server is rebuilt.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Source grep: `grep -R "ai-source-chip\|recommendationSourceLabel" -n frontend/src` returned no matches after the cleanup.
- Typecheck: `cd frontend && npm run typecheck` passed as part of `npm run build`.
- Targeted frontend regression: `cd frontend && npx vitest run src/app/__tests__/ai-results.test.tsx` passed (`7 passed`).
- Build and artifact check: `cd frontend && npm run build` passed; `grep -R "ai-source-chip\|recommendationSourceLabel" -n dist` returned no matches.
- Broader frontend test run: `cd frontend && npm test` after the ai-results test update ran `19` files / `169` tests with `18` files and `168` tests passing; the only remaining failure is the unrelated existing `policy-detail.test.tsx` section-order expectation (`신청 대상` not found).

## Remaining Risks

- Full frontend suite is not green because `src/app/__tests__/policy-detail.test.tsx` still has an unrelated section-order expectation mismatch outside this UI cleanup.
- Development-server deployment has not yet been performed for this cleanup in this local change set.
- Production deployment is intentionally not performed for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
