# CHECKLIST

## Current Status

- Latest validated scope: local `develop` reconciliation onto `origin/develop`, development-server stale-build recovery on `dev.travel-hunter.co.kr`, and frontend release-gate refresh after Vite/Vitest audit remediation.
- Last validation date: 2026-06-16.
- Current release posture: the development server is restored to clean `origin/develop` at `9169990aac582e4608648761b8633e56a429cbd5`; the validated frontend dependency/test updates and recovery docs are published through draft PR #55 (`fix/dev-recovery-audit-20260616` -> `develop`) and still need review/merge before any dev-server redeploy. Production release remains blocked on external DNS/Cloudflare/provider authority before any production stack mutation.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source-specific docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`.
- Invite/trip workflow spec: `docs/specs/invite-trip-edit-workflow.md` via `docs/specs/spec-index.md`.
- Screen and logic status: `docs/screen-feature-status-screens.md`, `docs/screen-feature-status-logic.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and linked deployment guides, especially `docs/deployment-cicd/09-release-checklist.md`.
- Dev-server recovery/runtime evidence: `.omx/specs/deep-interview-dev-server-stale-build-recovery.md`, `.omx/plans/dev-server-recovery-20260616.md`, `.omx/ultragoal/ledger.jsonl`, `.omx/evidence/dev-server-runtime-deploy-20260612.md`, `.omx/evidence/dev-server-runtime-gates-20260612.md`, `.omx/evidence/docker-dns-fix-20260612.md`, `.omx/evidence/production-preflight-20260612.md`.

## Latest Validations

- 2026-06-16 frontend release-gate refresh passed after Vite/Vitest audit remediation: `npm run --prefix frontend typecheck` passed; `npm --prefix frontend test` passed (18 files / 162 tests); `npm --prefix frontend audit --audit-level=high` passed (0 vulnerabilities); `npm run --prefix frontend build` passed; `npm run --prefix frontend test:e2e` passed (10 Playwright backend-mode tests).
- 2026-06-16 targeted frontend regression passed: `npm --prefix frontend run test:mojibake` passed; `cd frontend && node scripts/run-backend-command.cjs ./node_modules/.bin/vitest run src/pages/admin/AdminPages.test.tsx` passed (1 file / 9 tests).
- 2026-06-16 local branch reconciliation step passed: current `develop` was rebased onto `origin/develop` `9169990aac582e4608648761b8633e56a429cbd5`; backup branch `backup/develop-local-20260616T013555Z` and patch `.omx/evidence/local-recovery-docs-before-reconcile-20260616T013555Z.patch` preserve the pre-reconcile local docs state.
- 2026-06-16 development-server stale-build recovery passed: dirty server state was backed up under `/home/deploy/.travel-hunter-recovery/20260616T011723Z`; server repo was switched to clean `develop` and reset to `origin/develop` `9169990aac582e4608648761b8633e56a429cbd5`; `deploy/.env.prod` stayed present and unprinted.
- 2026-06-16 development-server rebuild/migration/public smoke passed: compose config/build/up and backend `alembic upgrade head` completed; backend/db were healthy; frontend/caddy/cloudflared were running; `/api/health`, `/login`, `/signup`, `/signup/verify`, `/policies`, unauthenticated `/home` redirect, `/api/policies`, `/api/regions`, and server source-boundary smoke passed.
- 2026-06-15 develop merge pre-push validation passed for email-first signup: backend pytest, Alembic offline SQL, frontend unit/typecheck/build/e2e, compose config, API golden JSON parse, whitespace checks, and UTF-8 scan passed before merge to `origin/develop`.

## Remaining Risks

- Draft PR #55 publishes the local release-gate fix, recovery docs, and frontend audit remediation, but it is not yet merged to `origin/develop`; merge must follow repository branch protection and CI/review gates.
- The development server is intentionally clean at `origin/develop` and does not include PR #55 until it is merged and a new dev-server redeploy is performed.
- Production DNS for `travel-hunter.co.kr` and `api.travel-hunter.co.kr` is still unresolved from local/remote probes.
- Cloudflare API/token/cert authority is not present in the current local or server environment; production public routing and provider console changes cannot be executed by the agent until that authority is provided securely or the user applies those console changes.
- Existing dev runtime env has required secret keys, but domain/redirect values are dev-domain scoped; production env must use production-domain values and a production-confirmed Cloudflare tunnel/token before stack start.
- Production stack deploy and public production smoke have not been executed because the Cloudflare/DNS no-go line is still active.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
