# CHECKLIST

## Current Status

- Latest validated scope: social OAuth onboarding now has an explicit two-step gate in local code: new social users must complete `/nickname-setup` before `/profile-setup`, profile save completes onboarding, and `나중에 설정` records a durable skip state while still completing onboarding. The local backend now persists `users.nickname_setup_completed` and `users.profile_setup_skipped`, and the frontend onboarding guard routes by explicit onboarding state instead of forcing every social account back to `/nickname-setup`.
- Last validation date: 2026-06-17.
- Current release posture: onboarding fix is implemented locally and deployed to `https://dev.travel-hunter.co.kr` with backend/frontend rebuild + Alembic migration. Production deployment remains out of scope for this task.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source-specific docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`.
- Invite/trip workflow spec: `docs/specs/invite-trip-edit-workflow.md` via `docs/specs/spec-index.md`.
- Screen and logic status: `docs/screen-feature-status-screens.md`, `docs/screen-feature-status-logic.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and linked deployment guides, especially `docs/deployment-cicd/09-release-checklist.md`.
- Dev-server recovery/runtime evidence: `.omx/specs/deep-interview-dev-server-stale-build-recovery.md`, `.omx/plans/dev-server-recovery-20260616.md`, `.omx/ultragoal/ledger.jsonl`, `.omx/evidence/dev-server-runtime-deploy-20260612.md`, `.omx/evidence/dev-server-runtime-gates-20260612.md`, `.omx/evidence/docker-dns-fix-20260612.md`, `.omx/evidence/production-preflight-20260612.md`.

## Latest Validations

- 2026-06-17 onboarding-state verification rerun passed after final review-gate fix: `cd backend && ./.venv/bin/python -m pytest tests/test_profile_db_routes.py tests/test_profile_db_service.py tests/test_auth_db_routes.py tests/test_auth_db_service.py tests/test_auth_edge_cases.py` (`78 passed, 1 upstream warning`); `cd frontend && npm run typecheck`; `cd frontend && npm test -- src/app/__tests__/onboarding.test.ts src/app/__tests__/auth.test.tsx src/app/__tests__/invite-oauth.test.tsx` (`32 passed`); `cd backend && ./.venv/bin/alembic upgrade head --sql`; `docker compose -f compose.yaml config`; and `curl -fsS -A 'Mozilla/5.0' https://dev.travel-hunter.co.kr/api/health` (`{"status":"ok","service":"travel-hunter-backend","environment":"staging","database":"connected"}`).
- 2026-06-17 final review-gate migration hardening added `backend/alembic/versions/0021_legacy_social_nickname.py` so pre-existing social users with `onboarding_completed = false` are backfilled into the nickname-confirmation step instead of silently skipping it.

## Remaining Risks

- Real browser validation for new and pre-existing dev social accounts after the `0021_legacy_social_nickname` backfill is still pending, so the Google/Kakao path is verified by migration/runtime evidence but not yet by an interactive click-through on `dev.travel-hunter.co.kr`.
- Existing unrelated local worktree changes are still present; any future deploy must keep shipping only the onboarding-related diff and must not clobber the unrelated policy/travel-area work already in progress.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
