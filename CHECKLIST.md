# CHECKLIST

## Current Status

- Latest validated scope: Kakao shared map UI for `/trips/:id?view=map` and `/ai-results?tripId=...`.
- Last validation date: 2026-05-27.
- Historical checklist archive was removed during repo slimming; this file now keeps only current status, latest validations, and remaining risks.

## Latest Validations

- `docker compose -f compose.yaml up -d --build` completed successfully.
- Docker backend health check returned `200`.
- Docker frontend at `http://127.0.0.1:4173` returned `200`.
- `cd frontend; npm run typecheck` passed.
- `cd frontend; npx vitest run src/App.test.tsx -t "map|AI"` was run via Node spawn to avoid Windows pipe parsing; 10 tests passed.
- Browser smoke passed for `http://127.0.0.1:5173/trips/112?day=2&view=map`.
- Browser smoke passed for `http://127.0.0.1:5173/ai-results?tripId=112`.
- Repo slimming: removed the root `scripts/` helper folder and deleted its local smoke script references from `docs/local-dev-runtime.md`.
- Repo slimming Task 0: deployment baseline classified as `compose.yaml` for local/default Docker verification, `compose.vps.yaml` with `deploy/.env.staging.example` for direct VPS/Caddy staging fallback, and `compose.tunnel.yaml` with `deploy/.env.tunnel.example` for the current Cloudflare Tunnel deployment baseline documented in `PLANS.md`.
- Repo slimming Task 0 validation: `docker compose -f compose.yaml config`, `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`, and `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config` passed.
- Repo slimming Task 1: generated artifact sweep found no remaining `*.log`, `*.out.log`, `*.err.log`, `*.tmp`, `*.bak`, `*.old`, or `*.orig` files in the repo file list. Ignored `frontend/node_modules/**/dist` package contents and `.worktrees/**` separate-worktree caches were not deleted.
- Repo slimming Task 2: removed the stale `frontend/src/App.test.tsx` assertion that required deleted `frontend/figma` mapping files to remain in the repo. Live references to deleted Figma files now remain only in the cleanup work spec as deletion-scope documentation.
- Repo slimming Task 3: removed `docs/archive/` because it was historical checklist material, not an active source-of-truth document.
- Repo slimming Task 3: removed unreferenced `docs/design-system-map.md`; it was a design reference tied to prior Figma cleanup, not a deployment/source-of-truth document.
- Repo slimming Task 4: removed unused `frontend/src/data/seedData.ts`; no frontend imports or live docs referenced it.
- Repo slimming Task 5 scan: backend `mock|fallback|legacy|create_all` hits were reviewed as candidates only. Current hits are test DB setup, documented policy fallback behavior, legacy seed cleanup, or itinerary fallback logic, so no backend deletion was made in this batch.
- Repo slimming follow-up: fixed `frontend/src/components/AppLayout.tsx` EOF whitespace so global `git diff --check` can pass.
- Repo slimming frontend dead-code follow-up: file-level reference scan found no safe additional frontend source deletions after removing `seedData.ts`.
- Repo slimming backend scripts follow-up: kept `backend/scripts/audit_policy_sources.py`, `crawl_dgtourcard.py`, and `validate_policy_data.py` because tests import them; removed untracked local-only `backend/scripts/kakao_local_smoke.py`.
- Repo slimming dependency review: frontend dependencies are used by source, tests, Vite/Vitest config, or Playwright e2e; backend requirements are used by app, tests, Alembic, or retained scripts. No package removal was made.
- Repo slimming generated artifact cleanup: removed Python `__pycache__`/`.pyc` files created during validation; `.gitignore` and `backend/.dockerignore` already exclude them.
- Repo slimming validation: `cd frontend; npm run typecheck` passed.
- Repo slimming validation: `cd frontend; npm test -- --run src/App.test.tsx` passed with 123 tests.
- Repo slimming validation: `cd frontend; npm run build` passed, then generated `frontend/dist/` was removed again as a build artifact.
- Repo slimming final validation: `cd frontend; npm run test:e2e` passed with 9 Playwright backend-mode tests after updating stale e2e expectations for the current active policy slug, AI candidate card selector, policy tab scroller, trip confirmed-status behavior, and 4-step trip creation flow.
- Repo slimming final validation: `cd frontend; npm run typecheck`, `cd frontend; npm run build`, `git diff --check`, `docker compose -f compose.yaml config`, `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`, and `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config` passed.
- Repo slimming final cleanup: removed regenerated `frontend/dist/`, `frontend/test-results/`, Python `__pycache__`, and `.pyc` artifacts after validation; artifact scan for `*.log`, `*.out.log`, `*.err.log`, `*.tmp`, `*.bak`, `*.old`, `*.orig`, and `*.pyc` returned no files.
- GitHub pre-push validation on 2026-05-28: `cd frontend; npm run typecheck` passed.
- GitHub pre-push validation on 2026-05-28: `cd backend; python -m pytest` passed with 398 tests. Pytest emitted a local cache cleanup warning for `backend/.pytest_cache`, which is ignored and not a tracked artifact.
- GitHub pre-push validation on 2026-05-28: `cd backend; alembic upgrade head --sql` passed and included migrations through `0016_kakao_place_metadata`.
- GitHub pre-push validation on 2026-05-28: `cd frontend; npm run build` passed, then generated `frontend/dist/` was removed again as a build artifact.
- GitHub pre-push validation on 2026-05-28: `docker compose -f compose.yaml config --quiet` and `git diff --check` passed.
- GitHub pre-push validation on 2026-05-28: `cd frontend; npm test -- --run` passed the frontend mojibake scan but did not reach Vitest because Docker Desktop was not running and the test helper could not start compose PostgreSQL.

## Remaining Risks

- Kakao Maps SDK rendering depends on the configured JavaScript key and allowed web domains.
- If the Kakao SDK fails to load, the shared map component falls back to the existing CSS map UI.
- The worktree contains many unrelated pre-existing changes; this checklist cleanup only archived and summarized `CHECKLIST.md`.
- The removed `scripts/local-recommendation-smoke.ps1` was a local helper, not a CI gate. Recreate a current smoke script later if deployment verification needs a single command.
- Local `deploy/.env.staging` and `deploy/.env.tunnel` files exist in the working directory. They were not read during cleanup and must remain uncommitted.
- The e2e runner still emits Windows `ConnectionResetError` noise when closing async transports after Playwright completes; the latest run completed with 9/9 tests passed and exit code 0.
- Docker Desktop must be running for the frontend test helper path that starts compose PostgreSQL.
- Local `.pytest_cache` directories can emit Windows permission warnings during pytest cache cleanup; they are ignored and should remain uncommitted.
