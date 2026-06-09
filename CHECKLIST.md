# CHECKLIST

## Current Status

- Latest validated scope: development-domain deployment smoke for `dev.travel-hunter.co.kr`: Cloudflare Tunnel route, frontend, backend health, database connection, Brevo SMTP, Google OAuth, and Kakao OAuth/Local configuration.
- Last validation date: 2026-06-09.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history or source-specific docs.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Release notes draft: `docs/release-notes-public-v1.md`.
- Local UX specs: `docs/specs/spec-index.md`, `docs/specs/local-ux-auth-account.md`, `docs/specs/local-ux-policy-trip-linking.md`, `docs/specs/local-ux-place-discovery.md`, `docs/specs/local-ux-incomplete-backlog.md`.
- Screen and logic status: `docs/screen-feature-status-screens.md`, `docs/screen-feature-status-logic.md`.
- Deferred domain email guide: `docs/brevo-cloudflare-email-guide.md`.
- Weekend Public v1 planning handoff: `.omx/plans/prd-weekend-public-v1-release.md`, `.omx/plans/test-spec-weekend-public-v1-release.md`, `.omx/plans/ralplan-consensus-weekend-public-v1-release.md`.

## Latest Validations

- 2026-06-09 Google OAuth dev smoke passed after callback cleanup: Google OAuth start returns HTTP 302 to Google with secure state cookie; backend callback/refresh/profile requests returned 302/200/200; Google user/social account rows were created; frontend callback now waits for bootstrap, navigates when `currentUser` is already present, and otherwise completes OAuth once. Validation: `cd frontend && npm run typecheck` passed, compose build/deploy passed, dev root returned HTTP 200, and `/api/health` returned DB connected. User browser re-smoke confirmed Google login now works.
- 2026-06-09 Kakao dev configuration smoke passed: Kakao Developers has `https://dev.travel-hunter.co.kr` registered as JavaScript SDK domain, Kakao Login is ON, REST API redirect URI is `https://dev.travel-hunter.co.kr/api/auth/oauth/kakao/callback`, Kakao email consent is set to required collection, runtime env has Kakao OAuth and Kakao Local values without printing secrets, `compose.tunnel.yaml` now passes Kakao Maps JS build arg plus Kakao Local backend env, compose config passed, backend/frontend/caddy rebuild passed, `/api/health` returned DB connected, and Kakao OAuth start returned HTTP 302 to `https://kauth.kakao.com/oauth/authorize` with `scope=account_email`. A failed browser attempt showed `profile_nickname` was still invalid, so the provider request now keeps only the required email scope.
- 2026-06-09 Kakao placeholder-email migration logic added: existing Kakao social accounts whose email is still `kakao_{providerId}@oauth.local` now upgrade to the verified Kakao email on the next successful Kakao login when no other user owns that email; conflicting emails are not auto-merged. Targeted OAuth migration tests passed (4 tests), backend/caddy redeploy passed, `/api/health` returned DB connected, and Kakao start still requests only `account_email`.
- 2026-06-09 Kakao OAuth cleanup pass completed: scoped cleanup kept production behavior unchanged, deduplicated Kakao OAuth edge-test setup, and revalidated `tests/test_auth_edge_cases.py` → 28 passed; `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config --quiet` passed; public `/api/health` returned DB connected.
- 2026-06-09 end-of-day docs handoff updated: `PLANS.md`, `docs/next-work-plan.md`, `docs/implemented-feature-spec.md`, `docs/mvp-api-contract.md`, `docs/requirements.md`, `docs/release-notes-public-v1.md`, and `docs/deployment-cicd/09-release-checklist.md` now reflect dev-domain Cloudflare/Brevo/Google/Kakao evidence, Kakao `account_email` scope, Kakao placeholder-email migration, and tomorrow's development-server-first release sequence.
- 2026-06-09 dev deployment smoke passed: Cloudflare Tunnel route `dev.travel-hunter.co.kr -> http://caddy:80` registered, `https://dev.travel-hunter.co.kr/` returned HTTP 200, `/api/health` returned HTTP 200 with `environment=staging` and `database=connected`, containers were running/healthy, and backend effective public base URL was `https://dev.travel-hunter.co.kr`.
- 2026-06-09 Brevo SMTP smoke passed after credential rotation/re-entry: SMTP auth passed and a direct backend password-reset email smoke returned `SMTP_SEND_RESULT=PASSED` without printing secret values.
- 2026-06-09 weekend Public v1 kickoff: invite URLs now resolve to `/invites/{token}/accept` from `TRAVEL_HUNTER_PUBLIC_BASE_URL`/frontend origin; expired or invalid invite UI explicitly asks users to request a new invite link.
- 2026-06-09 policy collection gate coverage: added backend tests for release-candidate quality thresholds and normalized policy list/detail exposure plus stale-source hiding. Targeted re-run passed: `cd backend && .venv/bin/python -m pytest tests/test_ops_routes.py::test_external_collection_quality_meets_release_candidate_gate_for_fresh_active_records tests/test_policy_normalization.py::test_promoted_policy_is_exposed_by_list_and_detail_then_hidden_when_source_stales -q` → 2 passed / 1 warning.
- 2026-06-09 targeted invite validation passed: backend public invite URL/default invite route tests (`tests/test_trip_db_service.py::test_invite_to_api_computes_display_flags`, `tests/test_trip_db_service.py::test_invite_to_api_uses_public_frontend_base_url`, `tests/test_trip_db_routes.py::test_db_recommendation_and_invite_routes`, `tests/test_invite_db_routes.py`) → 6 passed / 1 warning; frontend invite backend harness (`shares the invite link|accepts a valid invite|shows an invite error state|returns to the original invite`) → 4 passed / 15 skipped.
- 2026-06-09 Kakao Local REST representative smoke passed without printing key values: `cd backend && .venv/bin/python -m app.scripts.smoke_kakao_local_candidates --require-kakao --area-id jeju-all --style 맛집 --day-count 2 --limit 6 --min-candidates 1` → 1 PASS / 0 FAIL / 6 candidates.
- 2026-06-09 production env template added/validated: `deploy/.env.prod.example` covers `travel-hunter.co.kr`, public API base URL, CORS, secure cookie, OAuth callbacks, SMTP/Brevo placeholders, Kakao Maps/Local placeholders, and Cloudflare tunnel token placeholder; `docker compose --env-file deploy/.env.prod.example -f compose.tunnel.yaml config` passed. Actual `deploy/.env.prod` remains untracked/missing and must be supplied only on the runtime host.
- 2026-06-09 API contract/type validation passed: `.agent/evals/api-contract-golden.json` parsed, `frontend npm run typecheck` passed, backend API-shape targeted tests passed (6 passed / 1 warning), and `frontend/src/app/__tests__/ai-results.test.tsx` passed (7 tests) for recommendation `sourceType` UI behavior.
- 2026-06-09 policy/recommendation parallel validation passed: backend ops health tests → 3 passed / 1 warning; backend collection quality + normalized exposure tests → 2 passed / 1 warning; full policy normalization → 13 passed / 1 warning; backend recommendation fallback tests → 19 passed; frontend `/ai-results` source-badge tests → 7 passed; backend-mode Playwright policy flow smoke → 2 passed.
- 2026-06-09 observability split: dev frontend/proxy/tunnel/backend container status and public health smoke are now proven for `dev.travel-hunter.co.kr`; production `travel-hunter.co.kr` smoke and production-server logs remain unproven.
- 2026-06-09 release notes draft added: `docs/release-notes-public-v1.md` records current No Release grade, Kakao Local degraded-quality wording, saved-summary/catalog fallback posture, and ratings/reviews omission.
- 2026-06-09 repository hygiene passed: `git diff --check`, `git diff --check -- CHECKLIST.md`, and changed-file UTF-8 replacement-character scan passed.
- 2026-06-09 ralplan handoff retained: Architect and Critic approved weekend Public v1 PRD/test spec; deployment checklist ops smoke is bearer-authenticated with runtime-only token handling.
- 2026-06-09 release-grade audit: Public v1 and Release Candidate are not currently proven; public-release grade is currently No Release. `travel-hunter.co.kr` DNS did not resolve from local smoke, and local env presence checks found Google/Kakao OAuth, SMTP, public base URL, CORS, and secure-cookie production values absent from `backend/.env`; current public-release grade is No Release until DNS/deployment stability and provider/runtime evidence change.
- 2026-06-09 Kakao rating guard: removed the last demo `별점 4.7` seed label; code search shows no dedicated rating/review DTO exposure, and docs keep ratings/reviews as omitted or future scope.
- 2026-06-09 secret guard: `git ls-files` shows no tracked real `.env` files, `.gitignore` covers env files, and diff secret-pattern scan found no real credential values; the only hit was `secrets.token_urlsafe()` invite-token generation code.

## Remaining Risks

- Catalog fallback quality can still be sparse outside representative smoked areas.
- Policy list server search/pagination should remain conditional until local policy volume outgrows client-side filtering.
- Weekend Public v1 execution has started; dev Cloudflare Tunnel/DNS, SMTP, DB health, Google OAuth browser login, and Kakao OAuth start/Kakao Local runtime config are now verified, but Kakao browser login callback, production-server access, and production public smoke evidence remain owner/runtime blockers until verified.
- Domain-dependent dev Brevo/Cloudflare/SMTP/staging smoke work is partly verified; public OAuth redirect, production DNS, real provider OTP, and production smoke must still be verified or downgraded according to the approved PRD/test spec.
- Deployment and CI/CD work remain active release risks until the approved deployment gate passes.
- Kakao Maps SDK rendering still needs browser-level screen smoke even though the dev JavaScript SDK domain/key are configured and injected into the frontend build.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
