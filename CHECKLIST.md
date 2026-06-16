# CHECKLIST

## Current Status

- Latest validated scope: local 지역사랑 휴가지원/대한민국 반값여행 준비중 지역 공개 노출 plus 숙박세일 페스타 `ktostay` 수집, 85개 비수도권 인구감소지역 alias 목록/상세/저장/일정/추천 hybrid 처리.
- Last validation date: 2026-06-16.
- Current release posture: `origin/develop` includes PR #55 merge commit `45c629256107e99700abea0e80b39d569404e002`; the development server was reset to that SHA, rebuilt, migrated, and smoked successfully. Production release remains blocked on external DNS/Cloudflare/provider authority before any production stack mutation.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source-specific docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`.
- Invite/trip workflow spec: `docs/specs/invite-trip-edit-workflow.md` via `docs/specs/spec-index.md`.
- Screen and logic status: `docs/screen-feature-status-screens.md`, `docs/screen-feature-status-logic.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and linked deployment guides, especially `docs/deployment-cicd/09-release-checklist.md`.
- Dev-server recovery/runtime evidence: `.omx/specs/deep-interview-dev-server-stale-build-recovery.md`, `.omx/plans/dev-server-recovery-20260616.md`, `.omx/ultragoal/ledger.jsonl`, `.omx/evidence/dev-server-runtime-deploy-20260612.md`, `.omx/evidence/dev-server-runtime-gates-20260612.md`, `.omx/evidence/docker-dns-fix-20260612.md`, `.omx/evidence/production-preflight-20260612.md`.

## Latest Validations

- 2026-06-16 trip planning UX integration passed after merging `trip-member-limit-10`, `ai-day-labels-day-prefix`, and `trip-duration-seven-days`: backend `.venv/bin/python -m pytest tests/test_trip_db_service.py tests/test_trip_db_routes.py -q` passed (`101 passed, 1 upstream deprecation warning`); frontend `npx vitest run src/app/__tests__/trip-create.test.tsx src/app/__tests__/ai-results.test.tsx` passed (`23 passed`); frontend `npm run typecheck` passed. Final integrated limits are `participantCount` 1~10, trip duration/date range 2~7 days, and AI candidate Day selector labels `Day 1`~`Day 7`.
- 2026-06-16 PR #55 publication/merge passed: GitHub `Backend fast lane` and `Frontend DB-backed fast lane` completed successfully; PR #55 was marked ready and merged into `develop` as `45c629256107e99700abea0e80b39d569404e002`.
- 2026-06-16 local 숙박세일 페스타 hybrid policy implementation passed: live `https://ktostay.visitkorea.or.kr/` collection parsed/upserted 1 `stay_discount` source after traffic source returned expected optional 404; DB has 1 canonical stay policy, 85 `raw_payload.eligibleAreas`, `/api/policies` returns 85 `stay-discount-*` aliases and 0 canonical stay rows, and alias detail resolves. Backend image was rebuilt/restarted locally; `/api/health` returned connected and `/api/policies` smoke returned 98 total policies with 85 stay aliases. Final local gate passed: targeted backend tests (`115 passed` after fail-closed canonical fallback fix), full backend `pytest` (`486 passed, 1 warning`), Alembic SQL generation (`513` lines), frontend `npm run typecheck` + `npm test -- --run` (`18` files / `162` tests), API golden JSON parse, UTF-8 `U+FFFD` check, `git diff --check`, independent `code-reviewer` APPROVE, and `architect` CLEAR.
- 2026-06-16 local 지역사랑 휴가지원/대한민국 반값여행 parser hardening, DB re-collection, duplicate cleanup, and 준비중 공개 노출 passed: live `https://korean.visitkorea.or.kr/dgtourcard/tour50.do` HTML parsed/upserted 16 `local_half_trip` records; local DB now keeps 13 active public `local_half_trip` policies (`신청접수중` 5 + `준비중` 8) and hides 16 legacy duplicate `regional_benefit` policies. `regional_benefit` is excluded from public promotion/recommendation/raw detail fallback while retained as legacy source evidence. Targeted duplicate/promotion tests passed (`25 passed, 1 warning`), backend `pytest` passed (`469 passed, 1 warning`), `alembic upgrade head --sql` passed, local `/api/policies` returns 13 대한민국 반값여행 policies for this program, `git diff --check` passed, and changed Korean-bearing files decoded as UTF-8 without `U+FFFD`.
- 2026-06-16 development-server redeploy passed at `45c629256107e99700abea0e80b39d569404e002`: server repo was clean `develop`, `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config` completed without printing secrets, backend/frontend images built, frontend `npm ci` reported 0 vulnerabilities, frontend build used Vite `8.0.16`, Alembic `upgrade head` completed, and backend/db containers were healthy.
- 2026-06-16 development-server smoke passed: `https://dev.travel-hunter.co.kr/api/health`, `/api/profile-options`, URL-encoded `/api/recommendations/regions?style=맛집&region=부산&limit=3`, `/login`, `/signup`, `/signup/verify`, and `/policies` returned 200 via curl; browser smoke confirmed unauthenticated `/home` redirects to login, seed login reaches `/home`, authenticated `/policies` renders policy content, and `/signup/verify` renders verification copy.
- 2026-06-16 server source-boundary passed: server repo branch is `develop`, HEAD is `45c629256107e99700abea0e80b39d569404e002`, `git status --short` is clean, and server `frontend/package.json` contains `vite:^8.0.16`, `vitest:^4.1.9`, and `@vitejs/plugin-react:^6.0.2`.
- 2026-06-16 local frontend release-gate refresh passed before PR #55 merge: `npm run --prefix frontend typecheck`; `npm --prefix frontend test` (18 files / 162 tests); `npm --prefix frontend audit --audit-level=high` (0 vulnerabilities); `npm run --prefix frontend build`; `npm run --prefix frontend test:e2e` (10 Playwright backend-mode tests); staged diff/UTF-8 checks.
- 2026-06-16 local branch reconciliation and stale-build recovery passed: dirty server state was backed up under `/home/deploy/.travel-hunter-recovery/20260616T011723Z`; backup branch `backup/develop-local-20260616T013555Z` and patch `.omx/evidence/local-recovery-docs-before-reconcile-20260616T013555Z.patch` preserve pre-reconcile local docs state.

## Remaining Risks

- Full `npm test -- trip-create.test.tsx --run` in the isolated worktree could not start because the test wrapper attempted to bind compose PostgreSQL to `0.0.0.0:55432`, which was already allocated by another local session; the changed UI test was run directly with Vitest instead.
- Production `travel-hunter.co.kr` now resolves to Cloudflare addresses, but HTTPS returns Cloudflare 530; the root production hostname is not yet proven to route to a healthy origin/tunnel.
- Production `api.travel-hunter.co.kr` still does not resolve from local DNS probes, so API public smoke cannot start.
- Cloudflare API/token/cert authority for production DNS/tunnel changes is not present in the current local environment or server key-name probe; only the dev runtime tunnel token key exists on the server, and its value was not printed.
- Existing dev runtime env has required secret keys, but domain/redirect values are dev-domain scoped; production env must use production-domain values and production-confirmed Cloudflare tunnel/DNS records before stack start.
- Production stack deploy, provider callback updates, and public production smoke have not been executed because the Cloudflare/DNS no-go line is still active.
- 숙박세일 페스타 변경은 local Docker backend에만 재빌드/재시작 및 smoke 완료됨; development/production server 배포는 아직 수행하지 않았다.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
