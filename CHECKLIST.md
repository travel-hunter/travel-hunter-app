# CHECKLIST

## Current Status

- Active task: pre-development-server cleanup and readiness hardening from `.omx/specs/deep-interview-pre-dev-server-cleanup.md`, executed through `.omx/ultragoal/goals.json`.
- Current branch: `develop` at `e06a87c Merge onboarding wireframe C polish` when cleanup preflight started.
- Scope: risk-first local cleanup only — secrets/env audit, safe ignored artifact cleanup, behavior-preserving code-quality audit, docs/checklist cleanup, full local release gate, and local Lore-protocol commits.
- Non-goals: no user-visible behavior/API/schema change, no DB/volume deletion or reset, no real env/prod env deletion, no secret value output/copy/commit, no remote push/PR/merge/deployment without later explicit approval.
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

## Remaining Risks

- Public production-domain release is still unproven; development-server deployment and provider smoke remain separate future work.
- `frontend/src/styles/app.css`, `ItineraryDetailPage.tsx`, `backend/app/services/trips.py`, and large trip tests remain maintainability hotspots; avoid opportunistic broad refactors before server handoff.
- Full local release gate is currently clean locally, but provider-backed/dev-server smoke and production-domain release remain separate future work.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
