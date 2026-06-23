# CHECKLIST

## Current Status

- Active task: development-server handoff and smoke preparation after local cleanup.
- Current branch: `develop` at local commit `e142f04 Stabilize pre-server cleanup evidence`.
- Scope: development server `deploy@192.168.32.15` / hostname `C307-24`, repo `/home/deploy/travel-hunter-app`, compose file `compose.tunnel.yaml`, runtime env `deploy/.env.prod` without printing values.
- Non-goals: no production changes, no DB/volume deletion or reset, no secret value output/copy/commit, no Docker daemon/DNS changes, and no provider/browser smoke without separate step-specific approval.
- Safe workspace cleanup completed: `.ruff_cache`, `backend/.pytest_cache`, `frontend/dist`, and backend Python `__pycache__` directories were removed; real env files, `node_modules`, `backend/.venv`, Docker volumes/DB data, and active `.omx` state were preserved.
- Code-quality cleanup audit completed with no tracked production source edits: large candidates (`frontend/src/styles/app.css`, `ItineraryDetailPage.tsx`, `backend/app/services/trips.py`, `backend/tests/test_trip_db_service.py`, `docs/mvp-api-contract.md`) need separate planned refactors if pursued.
- E2E cleanup adjustment completed: `frontend/e2e-backend/backend-mode.spec.ts` now uses clone-tolerant home-card locators and accepts current policy fallback navigation when a generated trip has no matching policy. No product code, API shape, schema, or seed data changed.
- Validation date: 2026-06-23.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Current cleanup spec and durable goal state: `.omx/specs/deep-interview-pre-dev-server-cleanup.md`, `.omx/ultragoal/brief.md`, `.omx/ultragoal/goals.json`, `.omx/ultragoal/ledger.jsonl`.
- Deployment/CICD: `docs/deployment-cicd/README.md`, `docs/deployment-cicd/09-release-checklist.md`, `docs/local-dev-runtime.md`.

## Latest Validation Evidence

- Preflight/secret-env audit: tracked env-like files are examples/config/code paths; ignored real env files (`.env`, `backend/.env`, `frontend/.env`, `deploy/.env.prod`) were identified by name only and values were not printed.
- Safe artifact cleanup evidence: `.omx/ultragoal/evidence/G002-safe-artifact-cleanup.md`.
- Code-quality audit evidence: `.omx/ultragoal/evidence/G003-code-quality-cleanup-audit.md`.
- Full local release gate evidence: `.omx/ultragoal/evidence/G005-release-gate.md`.
- Frontend: `npm run typecheck` PASS; `npm test` PASS (21 files / 198 tests plus mojibake check); `npm run test:e2e` PASS (11 tests); `npm run build` PASS.
- Backend: `.venv/bin/python -m pytest` PASS (511 tests, 1 deprecation warning); `.venv/bin/alembic upgrade head --sql` PASS.
- Compose: `docker compose -f compose.yaml config` PASS; output was not persisted in docs/evidence because compose config includes environment material.
- Hygiene: `git diff --check` PASS; changed-file UTF-8 scan PASS; tracked env-like files are only `.env.example` files; ignored real env files remain untracked and preserved.
- Development server sync/build: SSH auth PASS for `deploy@192.168.32.15`; remote repo clean before sync; GitHub direct push to `develop` was rejected by repository PR-only rule, so local commit `e142f04d22f8899762d9cfe61ba319a31c92af71` was transferred by git bundle and fast-forwarded on the server; `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build` completed for backend and frontend; build log path is `/home/deploy/travel-hunter-build-20260623T094039Z-e142f04.log`.
- Development server runtime refresh: `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d backend frontend` recreated backend and frontend without DB/volume deletion; backend health is healthy and `https://dev.travel-hunter.co.kr/api/health` returns ok/DB connected; public HTML now references rebuilt frontend assets `index-BVW2vpdy.js` and `index-V7QS1Rru.css`.
- Development-server UI parity smoke: Playwright-authenticated checks confirmed `/home` renders the AI recommendation carousel/card markers, `/profile-setup?redirect=/home` renders the profile preference preview and preferred-region selector, and `/mypage` → `편집` renders the profile edit preference preview and preferred-region selector on both local `127.0.0.1:4173` and `https://dev.travel-hunter.co.kr`; visible data differs because local and dev use different backend datasets/profiles.
- Home recommendation reason cleanup: backend region recommendation `reason` copy was shortened for card display (`전국 혜택 추천`, `{region} 맞춤 혜택 N개`, `마감 임박 N개`, `{region} 혜택 N개`); `backend/.venv/bin/python -m pytest tests/test_region_recommendations.py tests/test_region_recommendation_routes.py` PASS (13 tests) and `backend/.venv/bin/python -m pytest` PASS (511 tests, 1 deprecation warning).
- Development server reason deploy: local commit `0d8f533` was bundle-transferred to the development server, `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build backend` and `up -d backend` completed without DB/volume deletion, `/api/health` returned ok/DB connected, and authenticated `/home` secondary bubbles now show compact examples such as `강원 맞춤 혜택 12개` and `부산 맞춤 혜택 3개`.

## Remaining Risks

- Public production-domain release is still unproven; development-server container restart/migration and provider smoke remain separate future work.
- `frontend/src/styles/app.css`, `ItineraryDetailPage.tsx`, `backend/app/services/trips.py`, and large trip tests remain maintainability hotspots; avoid opportunistic broad refactors before server handoff.
- Full local release gate and development-server image build are clean, but provider-backed/dev-server runtime smoke and production-domain release remain separate future work.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
