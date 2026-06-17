# CHECKLIST

## Current Status

- Latest implemented scope: `/trips/new` 여행 지역 선택 회귀 수정으로 17개 광역시도(`서울`, `부산`, `대구`, `인천`, `광주`, `대전`, `울산`, `세종`, `경기`, `강원`, `충북`, `충남`, `전북`, `전남`, `경북`, `경남`, `제주`)가 모두 1단계 지역 버튼과 backend 여행지역 추천 API에서 선택 가능하다.
- Validation date: 2026-06-17.
- Current deployment posture: PR #71 is merged to `develop`; local Docker and development server frontend/backend were rebuilt with no-cache and force-recreated from `origin/develop` (`507961a`).
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Backend targeted regression: `cd backend && .venv/bin/python -m pytest tests/test_travel_areas.py` passed (`13 passed`).
- Frontend targeted regression: `cd frontend && npx vitest run src/app/__tests__/trip-create.test.tsx` passed (`18 passed`).
- Frontend typecheck/build: `cd frontend && npm run typecheck` passed; `cd frontend && npm run build` passed.
- Diff hygiene: `git diff --check` passed before local container rebuild.
- Local container rebuild: `docker compose build --no-cache frontend backend && docker compose up -d --force-recreate frontend backend` completed; `http://127.0.0.1:4173/trips/` serves `assets/index-BXed6d8A.js` and `assets/index-C20Cq7uB.css`.
- Runtime API coverage smoke: local `GET /api/recommendations/travel-areas?sido={17개 광역시도}&limit=20` returned at least one item for every expected broad region; missing list was `[]`. Development server internal smoke at `507961a` also returned at least one item for all 17 broad regions and frontend dist serves `assets/index-asAg0sXf.js` / `assets/index-C20Cq7uB.css`.

## Remaining Risks

- Full frontend suite was not rerun for this region-selector scope; previous unrelated `policy-detail.test.tsx` section-order expectation mismatch may still remain.
- Production deployment is intentionally not performed for this scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
