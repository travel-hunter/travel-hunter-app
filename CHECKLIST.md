# CHECKLIST

## Current Status

- Latest implemented scope: development-server `/api/trips` hotfix restores local-half-trip city extraction so empty trip lists do not fail with a backend 500.
- Validation date: 2026-06-17.
- Current deployment posture: hotfix is merged to `develop` and deployed to the development server; production deployment remains out of scope.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Reproduced the `/api/trips` failure locally before the fix with `AttributeError: module 'app.services.local_half_trip_display' has no attribute 'city_from_title'`.
- Targeted backend regression: `cd backend && python -m pytest tests/test_trip_db_service.py::test_get_trip_recommendations_use_date_category_and_fresh_external_gate tests/test_policy_db_service.py::test_local_half_trip_policy_title_uses_bracketed_city_prefix -q` (`2 passed`).
- UTF-8 check for changed Python service file: passed; `git diff --check`: passed.
- Development-server deployment smoke: server `develop` at `268c318`; Docker backend/frontend rebuilt; Alembic upgrade completed; `https://dev.travel-hunter.co.kr/api/health` returned database connected; authenticated `https://dev.travel-hunter.co.kr/api/trips` returned HTTP 200; `/trips` page returned HTTP 200.
- Broader backend service check: `cd backend && python -m pytest tests/test_trip_db_service.py tests/test_policy_db_service.py -q` (`99 passed, 1 failed`). The remaining failure is an existing recommendation-order expectation unrelated to this hotfix path.

## Remaining Risks

- Production deployment is intentionally not performed for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
