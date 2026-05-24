# Travel Hunter Harness Checklist

## 현재 기준 문서

- [x] Product/current state: `docs/current-work-spec.md`
- [x] Implemented behavior: `docs/implemented-feature-spec.md`
- [x] API contract: `docs/mvp-api-contract.md`
- [x] DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`
- [x] Local runtime: `docs/local-dev-runtime.md`
- [x] Deployment/CICD: `docs/deployment-cicd/README.md`
- [x] Next priority: `docs/next-work-plan.md`
- [x] Collaboration rules: `CONTRIBUTING.md`, `AGENTS.md`

## 현재 보장 조건

- [x] Runtime mock API mode is removed; frontend data access goes through `AppDataApi`.
- [x] User-facing backend behavior is PostgreSQL-backed.
- [x] Policy detail routes use `policySlug` / `policies.slug`.
- [x] Trip routes use internal trip ids; public trip slugs are not introduced.
- [x] API DTO fields stay `camelCase`; DB and SQL fields stay `snake_case`.
- [x] Backend route/schema/service/repository boundaries remain the implementation pattern.
- [x] Schema changes are managed by Alembic, not SQLAlchemy `create_all()`.
- [x] Real `.env` files, DB passwords, OAuth secrets, auth secrets, tunnel tokens, and Docker image archives are not committed.
- [x] Cloudflare Tunnel is the current deployment baseline; Jenkins is still a planned CD path.
- [x] Release readiness criteria live in `docs/deployment-cicd/09-release-checklist.md`.
- [x] `.agent/evals/api-contract-golden.json` remains the machine-readable API contract eval.

## 최근 검증

- 2026-05-19 DB schema docs: `git diff --check`, stale schema-reference search, `python -m pytest tests/test_db_schema.py`, `alembic upgrade head --sql`, and `alembic current` passed.
- 2026-05-19 docs core cleanup: stale deleted-doc reference search and `git diff --check` passed.
- 2026-05-19 backend docs cleanup: stale backend doc/eval reference search and `git diff --check` passed.
- 2026-05-19 frontend docs cleanup: stale frontend README/eval reference search and `git diff --check` passed.
- 2026-05-19 AI docs cleanup: AI/Codex guidance is consolidated in `docs/deployment-cicd/06-ai-workflow.md`; reference search and `git diff --check` passed.
- 2026-05-19 remaining docs cleanup: `CHECKLIST.md`, `PLANS.md`, `README.md`, `.agent` release readiness docs, and release checklist were compacted; removed-doc reference search, `.agent/evals` listing, and `git diff --check` passed.
- 2026-05-19 final verification: frontend `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` passed after updating stale e2e expectations to the current policy CTA, invite, logout, and trip creation flows; backend `python -m pytest tests/test_db_schema.py`, `python -m pytest`, `alembic upgrade head --sql`, compose config checks, and `docker compose -f compose.yaml build` passed.
- 2026-05-19 PR #17 handoff: `feat/prototype-to-react` was pushed to origin, `develop` PR #17 was opened, GitHub Actions frontend/backend fast lanes passed, reviewers were requested, and `compose.tunnel.yaml` actual-env `config --quiet` plus build passed. Full tunnel `up`, migration, and public health smoke were intentionally left for the release window.
- 2026-05-19 deployment hardening: Protected routes now wait for session bootstrap before redirecting, and tunnel compose services use `restart: unless-stopped`; frontend typecheck/test, tunnel compose config checks, tunnel build, and `git diff --check` passed.
- 2026-05-20 branch stabilization: PR #17 merged into `develop` (commit `b5c0557`); PRs #18, #19, #20 subsequently merged; local `develop` pulled to `80c9876`; `git diff --check` passed; doc references verified (all referenced files exist); frontend `npm run typecheck` and `npm run build` passed. Full test suite requires Docker Desktop.
- 2026-05-20 trip alias cleanup: the old non-numeric 제주 3-day trip handle support was removed while keeping the 제주 seed trip data; frontend `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`, backend `python -m pytest`, API eval JSON validation, compose config, `git diff --check`, and stale alias reference search passed.
- 2026-05-20 project status docs refresh: `docs/current-work-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`, and `docs/requirements.md` were updated to the `develop` staging-smoke-ready baseline; scoped stale reference search, API eval JSON validation, and `git diff --check` passed.
- 2026-05-20 release handoff: `docs/deployment-cicd/release-handoff-2026-05-20.md` records the `develop` staging smoke candidate, validation evidence, host-only env inputs, startup commands, and remaining risks.
- 2026-05-20 develop sync: PR #23 merged into `develop` at `9bdcb73`; local `develop` and `origin/develop` are synced.
- 2026-05-20 staging ops work orders: `docs/deployment-cicd/staging-ops-work-orders.md` was added for non-developer external infra/ops handoff, current status docs were updated to the PR #23 baseline, and documentation validation passed with `git diff --check`, targeted reference search, and assigned-secret scan.
- 2026-05-20 meeting brief: `docs/meeting-briefs/travel-hunter-dev-status-2026-05-20.md` was revised into a shareable detailed representative/PM status report with only necessary status, completion, remaining-work, decision, risk, and next-step lists; `git diff --check`, source reference search, and assigned-secret scan passed.
- 2026-05-21 itinerary auto-course validation: branch `codex/itinerary-auto-course` generates itinerary course days from selected region, dates, and course preference through the FastAPI/AppDataApi contract path; backend provider/service checks `python -m pytest tests/test_itinerary_recommendations.py tests/test_trip_db_service.py -q -p no:cacheprovider` passed (37 passed), backend route smoke `python -m pytest tests/test_trip_db_routes.py::test_db_recommendation_and_invite_routes -q -p no:cacheprovider` passed (1 passed), `.agent/evals/api-contract-golden.json` validated with `python -m json.tool`, `docker compose -f compose.yaml config` passed, frontend `npm run typecheck` passed after installing worktree dependencies, and targeted frontend `npm test -- --run src/App.test.tsx -t "uses selected region and dates when creating a trip"` passed with Docker access enabled.
- 2026-05-21 travelmonth regional benefit collection design: `docs/superpowers/specs/2026-05-21-travelmonth-regional-benefit-collection-design.md` records the confirmed official-source collection schema for 여행가는 달 지역 여행할인 모아보기, including source metadata, raw preservation, derived ranking fields, nationwide fallback handling, freshness rules, and implementation test criteria; documentation validation used `git diff --check`.
- 2026-05-21 travelmonth regional benefit collection plan: `docs/superpowers/plans/2026-05-21-travelmonth-regional-benefit-collection.md` defines the implementation sequence for the Phase 2 official-source collection foundation, covering the external source table, parser, normalizer, repository, collection service, docs, and validation commands; documentation validation used `git diff --check`.
- 2026-05-21 travelmonth regional benefit collection foundation: table/parser/normalizer/repository/collection service were added for the official-source collection foundation; backend targeted pytest `python -m pytest tests/test_db_schema.py tests/test_travelmonth_normalizer.py tests/test_travelmonth_parser.py tests/test_external_source_repository.py tests/test_travelmonth_collection.py -q -p no:cacheprovider` passed with 21 tests, `alembic upgrade head --sql`, `docker compose -f compose.yaml config`, and `git diff --check` passed.
- 2026-05-21 travelmonth live collector PoC: `backend/app/services/travelmonth_live_collector.py` fetches the official regional benefit page with `httpx` and hands the HTML to the existing parser/collection service boundary; mocked fetch success, timeout wrapping, and unexpected HTML empty-parse behavior passed with `python -m pytest tests/test_travelmonth_live_collector.py tests/test_travelmonth_collection.py tests/test_travelmonth_parser.py -q -p no:cacheprovider`. Network smoke against the live official page remains a manual approval-gated check.
- 2026-05-21 external collection scheduler cadence: env-gated daily backend scheduler wiring was added for the TravelMonth live collector, reusing the notification scheduler cadence pattern; targeted scheduler/collector pytest passed with 28 tests, full backend `python -m pytest -p no:cacheprovider` passed with 255 tests when `TMP`/`TEMP` pointed at a workspace temp directory, `alembic upgrade head --sql`, `docker compose -f compose.yaml config`, `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config`, and `git diff --check` passed. Live network smoke remains approval-gated.
- 2026-05-21 external source region recommendation API: `GET /api/recommendations/regions` ranks active/fresh regional benefit records by region benefit count, ending-soon count, explicit KRW value, and non-overriding style tie-breaks; nationwide records are fallback-only. Backend route/service targeted pytest passed with 7 tests, full backend `python -m pytest -p no:cacheprovider` passed with 260 tests when `TMP`/`TEMP` pointed at a workspace temp directory, `.agent/evals/api-contract-golden.json` validated with `python -m json.tool`, frontend `npm run typecheck`, `docker compose -f compose.yaml config`, and `git diff --check` passed.
- 2026-05-21 home region recommendation UI: `/home` now reads `GET /api/recommendations/regions` through `AppDataApi` and uses profile style plus `limit=3` for the popular domestic destination rail, falling back to policy-derived destinations when recommendations fail or return empty. Targeted Home tests `npm test -- --run src/App.test.tsx -t "home"` passed with 7 tests after adding explicit empty-response fallback coverage, targeted RED/GREEN recommendation tests `npm test -- --run src/App.test.tsx -t "region recommendations"` passed with 4 selected tests after the expected pre-implementation failure, frontend `npm run typecheck`, `npm run build`, and `git diff --check` passed.
- 2026-05-21 phone OTP verification foundation: `/api/me/contact/verification/request` and `/api/me/contact/verification/confirm` were added with a dev/test phone verification provider boundary, hashed OTP storage in `phone_verification_codes`, MyPage request/confirm UI, and contract/eval/schema docs updates. Targeted backend `python -m pytest tests/test_phone_verification_service.py tests/test_profile_db_routes.py tests/test_profile_db_service.py tests/test_db_schema.py -q -p no:cacheprovider` passed with 21 tests, targeted frontend `npm test -- --run src/App.test.tsx -t "notification contact"` passed with 6 selected tests, `.agent/evals/api-contract-golden.json` validated with `python -m json.tool`, frontend `npm run typecheck` and `npm run build` passed, `alembic upgrade head --sql`, `docker compose -f compose.yaml config`, and `git diff --check` passed.
- 2026-05-21 phone OTP SOLAPI provider: `PHONE_VERIFICATION_PROVIDER=dev|solapi` now selects the phone verification provider, defaulting to dev and using SOLAPI SMS when explicitly enabled. Targeted provider/service/profile tests passed with 26 tests, full backend `python -m pytest -p no:cacheprovider --basetemp .pytest-tmp` passed with 273 tests, `.agent/evals/api-contract-golden.json` validated with `python -m json.tool`, `alembic upgrade head --sql`, `docker compose -f compose.yaml config`, `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config`, `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`, and `git diff --check` passed. Live SOLAPI SMS smoke remains approval-gated because it can send paid messages.
- 2026-05-21 profile region recommendation tie-breaker: `GET /api/recommendations/regions` now accepts optional `region` and uses it only as the final tie-breaker after policy count, ending-soon count, explicit KRW value, and style; `/home` passes profile region through `AppDataApi`. Backend route/service targeted pytest `python -m pytest tests/test_region_recommendations.py tests/test_region_recommendation_routes.py -q -p no:cacheprovider` passed with 6 tests, `.agent/evals/api-contract-golden.json` validated with `python -m json.tool`, frontend `npm run typecheck` passed, targeted frontend `npm test -- --run src/App.test.tsx -t "uses profile style to render region recommendations"` passed with Docker access enabled, and `git diff --check` passed.
- 2026-05-21 travelmonth live parser hardening: the official live `travelmonth/benefit.do` thumbnail/modal HTML shape is parsed in addition to the original fixture shape, including modal benefit/contact/detail fields and official items without period dates. Targeted parser/collector pytest `python -m pytest tests/test_travelmonth_parser.py tests/test_travelmonth_collection.py tests/test_travelmonth_live_collector.py tests/test_region_recommendations.py -q -p no:cacheprovider` passed with 16 tests, live network smoke fetched the official page and parsed/upserted 58 records into an in-memory SQLite DB, and `git diff --check` passed.
- 2026-05-21 external collection parse threshold: scheduler runs now require at least `EXTERNAL_COLLECTION_MIN_PARSED_COUNT` parsed records before marking a date successful, so zero-parse or below-threshold official page changes retry on the next poll instead of being silently accepted. Targeted scheduler pytest `python -m pytest tests/test_external_collection_scheduler.py -q -p no:cacheprovider` passed with 10 tests, env examples document the safe default `EXTERNAL_COLLECTION_MIN_PARSED_COUNT=1`, and `git diff --check` passed.
- 2026-05-21 external collection scheduler status: scheduler attempts now retain internal status for last attempted date, last successful date, parsed count, outcome, and error so cadence/failure monitoring has a stable service boundary before adding any public ops endpoint. RED/GREEN status tests passed, targeted scheduler pytest `python -m pytest tests/test_external_collection_scheduler.py -q -p no:cacheprovider` passed with 13 tests, and `git diff --check` passed.
- 2026-05-21 external collection ops health: `GET /api/ops/external-collection` exposes the TravelMonth external collection scheduler cadence and current in-memory status snapshot without changing `/api/health`; RED route test failed with 404 before implementation, targeted ops/scheduler pytest `python -m pytest tests/test_ops_routes.py tests/test_external_collection_scheduler.py -q -p no:cacheprovider` passed with 16 tests, API eval JSON validated, and `git diff --check` passed.
- 2026-05-21 external collection quality report: `GET /api/ops/external-collection/quality` summarizes `external_source_records` counts, freshness, amount/style coverage, region quality, and recommendation preview without live network fetch; RED route tests failed before implementation, targeted ops/recommendation/repository pytest passed with 12 tests, API eval JSON validated, and `git diff --check` passed.
- 2026-05-21 external collection ops smoke docs: staging ops work orders and the release checklist now include smoke steps for `GET /api/ops/external-collection` and `GET /api/ops/external-collection/quality`, including empty-DB interpretation, no-live-fetch quality semantics, and evidence to keep. Documentation validation used targeted reference search and `git diff --check`.
- 2026-05-21 staging smoke attempt: `develop` was built with `docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml build`, DB was started, Alembic migration and seed passed after synchronizing the existing Docker volume DB role password with the current tunnel env, and backend/Caddy/internal route smoke passed. Internal API checks returned 200 for `/api/health`, `/api/ops/external-collection`, `/api/ops/external-collection/quality`, and `/api/recommendations/regions`; manual TravelMonth live collection parsed/upserted 58 records and quality reported 58 total records with 3 recommendation previews. Public HTTPS smoke is blocked because the local tunnel env still uses a placeholder staging domain and cloudflared reports an invalid tunnel token.
- 2026-05-21 local collection itinerary smoke target: Cloudflare/provider smoke was split out from the immediate feature goal, and the local completion target was recorded in `docs/superpowers/specs/2026-05-21-local-collection-itinerary-recommendation-smoke-design.md`, `docs/current-work-spec.md`, and `docs/next-work-plan.md`. The next implementation track starts with a local TravelMonth collection command and repeatable local recommendation smoke script.
- 2026-05-21 local collection itinerary smoke implementation plan: `docs/superpowers/plans/2026-05-21-local-collection-itinerary-recommendation-smoke.md` defines the CLI, local smoke script, backend integration, frontend/e2e verification, documentation, and final validation tasks for the local completion target. Plan validation used placeholder search and `git diff --check`.
- 2026-05-21 local collection itinerary smoke automation: added `python -m app.scripts.collect_travelmonth_once` and `scripts/local-recommendation-smoke.ps1` so local Docker Compose can verify TravelMonth collection, quality report, region recommendations, authenticated trip creation, generated trip days/places, and trip recommendations without Cloudflare. Backend targeted pytest, frontend targeted trip tests, backend e2e smoke, script syntax, local smoke (`collection parsedCount=58`, `quality totalRecords=58`, `region recommendations=3`, latest `tripId=62`), and `git diff --check` passed.
- 2026-05-22 collected policy list exposure: `/api/policies` now returns active/fresh TravelMonth `regional_benefit` records from `external_source_records` as `sourceType="external"` policies with `travelmonth-{externalSourceRecordId}` slugs, and `/policies` renders them without save/trip-link actions while detail keeps the official CTA. Backend full pytest passed with 292 tests, frontend typecheck/test/build passed with 88 frontend tests, API eval JSON validated, latest Docker Compose smoke collected `parsedCount=58` and showed 47 external policies out of 74 total policies, and `git diff --check` passed.
- 2026-05-22 itinerary recommendation user flow: `/trips/new?region=...` now preserves the home recommendation region during trip creation, collected `travelmonth-{id}` policy slugs are reference-only and are not sent to `trip_policies` linking, and `/ai-results?tripId=...` disables duplicate place additions for recommendations already on the trip timeline. RED/GREEN targeted frontend tests passed, frontend `npm run typecheck` passed, and full `npm test -- --run src/App.test.tsx` passed with 83 tests.
- 2026-05-22 home AI recommendation CTA: `/home` AI 추천 맞춤 일정 카드 no longer reads `listTrips()[0]` or links to an existing trip; it uses the top region recommendation or policy-region fallback and links to `/trips/new?region=...`. RED targeted test first failed with the existing `/trips/{id}` link, then `npm test -- --run src/App.test.tsx -t "uses a region recommendation CTA"`, `npm test -- --run src/App.test.tsx -t "home"`, frontend `npm run typecheck`, full `npm test -- --run src/App.test.tsx` with 84 tests, and `git diff --check` passed. A parallel targeted test attempt hit a transient FastAPI `127.0.0.1:8001` port bind conflict, then passed when rerun serially.
- 2026-05-22 trip detail recommended policy links: `GET /api/trips` and `GET /api/trips/{tripId}` now include `recommendedPolicies`, and `/trips/{id}` renders the matching policy rail from that backend response instead of hardcoded articles, linking each card to `/policies/{slug}`. Recommendation candidates include internal policies plus active/fresh TravelMonth collected benefits with `travelmonth-{id}` detail slugs; the old generic "이 일정에 맞는 정책을 더 찾아보세요" card was replaced with an empty state. RED backend/frontend tests failed before implementation, then backend targeted pytest passed with 66 tests, backend full pytest passed with 294 tests, frontend `npm run typecheck` passed, full `npm test -- --run src/App.test.tsx` passed with 86 tests, API eval JSON validated, and `git diff --check` passed.
- 2026-05-22 local recommendation smoke policy detail coverage: `scripts/local-recommendation-smoke.ps1` now verifies created trip `recommendedPolicies` is non-empty and resolves the first recommended slug through `/api/policies/{slug}`. PowerShell syntax validation passed, an initial `-SkipBuild` smoke exposed a stale backend image with empty `recommendedPolicies`, then the full build smoke passed with `collection parsedCount=58`, `quality totalRecords=58`, `region recommendations=3`, latest `tripId=70`, and `recommendedPolicySlug=busan-cashback`.
- 2026-05-22 security review HIGH resolution: OTP resend cooldown now rejects re-request attempts within 60 seconds with 429, and `/api/ops/external-collection` plus `/api/ops/external-collection/quality` require bearer auth. RED tests failed before implementation, then phone/provider/profile targeted pytest passed with 21 tests, ops/scheduler targeted pytest passed with 19 tests, API eval JSON validated, and `git diff --check` passed.
- 2026-05-22 policy category benefit types: `Policy.category` now uses benefit/source categories `교통`, `숙박`, `여행상품`, `지역할인`, `이벤트`, `기타`; TravelMonth external policy DTOs derive category from source URL/sourceCategory instead of a fixed 숙박 value, and `travelStyles` remains only for recommendation scoring. RED backend/frontend tests failed before implementation, then backend targeted pytest passed with 65 tests, frontend `npm run typecheck` passed, full `npm test -- --run src/App.test.tsx` passed with 86 tests, API eval JSON validated, old category literal search found only legacy compatibility/content strings outside DTO/filter values, and `git diff --check` passed.
- 2026-05-22 policy category tab layout: `/policies` category tabs now use a single-row `flex` layout with horizontal overflow instead of the old 4-column grid, preventing the expanded 7-category menu from wrapping into the filter row on mobile. RED Playwright check first failed with computed `display=grid`, then targeted Playwright passed, frontend `npm run typecheck` passed, targeted `npm test -- --run src/App.test.tsx -t "prototype category tabs"` passed with 6 tests, and `git diff --check` passed. The stale full e2e profile expectation was resolved in the following frontend visual/layout polish step.
- 2026-05-22 frontend visual/layout polish: `/home`, `/policies`, `/trips/new`, `/trips/{id}`, and `/mypage` now have clearer policy category/source chips, region-specific trip recommendation empty state text, safer card text wrapping, and mobile/desktop horizontal-overflow regression coverage at 360, 390, 430, 1024, and 1440 widths. The backend e2e runner now forwards Playwright arguments for targeted layout checks, the stale `부산 여행` e2e expectation was replaced with the current profile-style CTA assertion, and the AI recommendation button test now handles the valid `이미 일정에 있음` disabled state. Validation passed: `frontend npm run typecheck`, full `npm test -- --run src/App.test.tsx` with 86 tests, full `npm run test:e2e` with 7 tests, targeted Playwright layout tests, and `git diff --check`.
- 2026-05-22 local user-flow smoke: backend-mode e2e now covers `/home` recommendation CTA -> `/trips/new` -> trip creation -> `/trips/{id}` recommended policy card -> `/policies/{slug}` detail CTA, and passed through an external collected policy detail (`travelmonth-36`) in targeted and full e2e runs. `scripts/local-recommendation-smoke.ps1 -SkipBuild` also passed after verifying live collection `parsedCount=58`, quality `totalRecords=58`, region recommendations `3`, created `tripId=73`, resolved `recommendedPolicySlug=busan-cashback`, and confirmed an external collected policy detail `externalPolicySlug=travelmonth-1` has `sourceType=external`, an `officialUrl`, and no direct `applyUrl`.
- 2026-05-22 official benefit user-facing cleanup: policy list/detail/trip creation/help copy/docs/evals now avoid user-facing implementation labels and the old official 안내 CTA wording. `officialUrl` CTAs render as `혜택 안내 보기`; raw collected `travelmonth-{id}` records keep neutral temporary save/trip action gates until normalization promotes them into `policies`. Validation passed: `frontend npm run typecheck`, `frontend npm test -- --run src/App.test.tsx` with 86 tests, `python -m json.tool .agent/evals/api-contract-golden.json`, and `git diff --check`.
- 2026-05-22 official benefit normalization Phase 2: active/fresh TravelMonth `regional_benefit` records are promoted into `policies` with source tracking columns and `travelmonth-{externalSourceRecordId}` slugs; `/api/policies` and trip recommendations now use normalized policies instead of raw `external_source_records` merging, while detail keeps a temporary raw fallback for migration gaps. Save/trip attach actions are enabled for normalized official benefits, `/trips/new` links `travelmonth-{id}` policy slugs, and the local collection smoke now authenticates before calling ops quality. Validation passed: backend targeted pytest `55 passed`, backend full `python -m pytest -p no:cacheprovider --basetemp .pytest-tmp` `303 passed`, frontend `npm run typecheck`, frontend `npm test` `94 passed`, `alembic upgrade head --sql`, `python -m json.tool .agent/evals/api-contract-golden.json`, `docker compose -f compose.yaml config --quiet`, `docker compose -f compose.yaml build backend`, and `scripts/local-recommendation-smoke.ps1 -SkipBuild` with `collection parsedCount=58`, `quality totalRecords=58`, `region recommendations=3`, `tripId=77`, `recommendedPolicySlug=busan-cashback`, `externalPolicySlug=travelmonth-1`.
- 2026-05-22 policy capability/error handling review alignment (`d5db116`): ops/recommendation/policy service hardening to keep review feedback consistent with policy capability filtering and error handling. Validation passed: `python -m pytest tests/test_ops_routes.py tests/test_region_recommendations.py tests/test_policy_db_service.py -q -p no:cacheprovider`, `npm test -- --run src/App.test.tsx -t "renders collected TravelMonth benefits in the policy list"`, and `git diff --check`.

## 2026-05-23 External Benefit Source Expansion

- [x] `cd backend; python -m pytest tests/test_travelmonth_traffic_parser.py tests/test_dgtourcard_parser.py tests/test_external_benefit_collection.py tests/test_policy_normalization.py tests/test_region_recommendations.py tests/test_ops_routes.py -q` passed with 24 tests.
- [x] `cd backend; python -m pytest` passed with 313 tests.
- [x] `cd backend; alembic upgrade head --sql` passed.
- [x] `docker compose -f compose.yaml config` passed.
- Note: pytest emitted a non-blocking cache warning for `.pytest_cache` path creation on Windows (`WinError 183`), while all tests passed.

Remaining risks:
- Official source HTML can change without notice.
- `traffic_benefit` remains excluded from destination ranking by design.

## 2026-05-23 Staging Env Readiness

- [x] Audited local `deploy/.env.tunnel` without printing secret values; required runtime keys are present but staging domain, DB password, auth secret, public URLs, and Cloudflare tunnel token remain placeholder values.
- [x] `docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config --quiet` passed.
- [x] `git check-ignore -v deploy/.env.tunnel deploy/.env.staging deploy/.env.tunnel.example deploy/.env.staging.example` confirmed real env files are ignored.

Remaining risks:
- OPS-02 actual full-up is blocked until real staging domain, Cloudflare tunnel token, DB password, auth secret, and public URL values are entered on the staging host.
- SMTP, OAuth, SOLAPI, and SMS smoke checks remain blocked until provider console credentials and callback/webhook settings are configured.

## 2026-05-23 Policy Category Classification

- [x] `cd backend; python -m pytest tests/test_policy_category_classifier.py tests/test_policy_db_service.py tests/test_policy_normalization.py tests/test_policy_category_reclassification_cli.py -q` passed with 27 tests.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "transport and travel product category tabs"` passed with 1 selected test.
- [x] `cd backend; python -m pytest tests/test_policy_db_service.py tests/test_policy_normalization.py tests/test_trip_db_service.py -q` passed with 57 tests.
- [x] `git diff --check` passed.
- Note: pytest emitted a non-blocking Windows cache warning for `.pytest_cache` path creation (`WinError 183`), while all tests passed.

Remaining risks:
- Keyword rules can over-classify ambiguous policy text.
- Existing promoted DB rows require promotion rerun or `python -m app.scripts.reclassify_external_policy_categories --apply`.

## 2026-05-23 Policy Category URL State

- [x] RED check: `cd frontend; npm test -- --run src/App.test.tsx -t "restores the policy category tab from the URL"` failed before implementation because the `여행상품` tab did not have the `active` class.
- [x] GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "restores the policy category tab from the URL"` passed with 5 selected tests.
- [x] Regression check: `cd frontend; npm test -- --run src/App.test.tsx -t "category"` passed with 3 selected tests.
- [x] `cd frontend; npm run typecheck` passed.

Remaining risks:
- Only the top-level policy category tab is URL-backed in this change; region, period, amount, and saved-only filters remain local state.

## 2026-05-23 Policy Region Filter Simplification

- [x] RED check: `cd frontend; npm test -- --run src/App.test.tsx -t "primary regions"` failed before implementation because the old region filter rendered every region directly and had no `지역 필터` group, `주요 지역`, or `전체 지역 보기` affordance.
- [x] GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "primary regions"` passed with 2 selected tests.
- [x] Regression check: `cd frontend; npm test -- --run src/App.test.tsx -t 'category'` passed with 3 selected tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed.
- [x] Runtime smoke passed: `GET http://127.0.0.1:8000/api/health` returned `database: connected`, frontend `http://127.0.0.1:4173` returned HTTP 200, and Compose reported DB/backend healthy with frontend running.

Remaining risks:
- Primary regions are computed from visible policy counts and profile region, so some familiar regions such as 부산 can move behind `전체 지역 보기` when other regions have more current policies.

## 2026-05-23 Policy Benefit Detail Structure

- [x] RED check: `cd frontend; npm test -- --run src/App.test.tsx -t "scannable detail groups"` failed before implementation because the support detail still rendered the long summary in `.highlight-box .meta`.
- [x] GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "scannable detail groups"` passed with 1 selected test.
- [x] Regression check: `cd frontend; npm test -- --run src/App.test.tsx` passed with 90 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `git diff --check` passed with line-ending warnings only.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed.
- [x] Runtime smoke passed: `GET http://127.0.0.1:8000/api/health` returned `database: connected`, frontend `http://127.0.0.1:4173` returned HTTP 200, Compose reported DB/backend healthy with frontend running, and the in-app browser loaded `Travel Hunter` with the app root mounted.

Remaining risks:
- Benefit grouping is heuristic frontend display logic. Backend/source-level structured benefit fields are still a future improvement.
- Source summaries with unusual punctuation can still require parser normalization for perfect grouping.

## 2026-05-23 TravelMonth Benefit Value Normalization

- [x] Investigation confirmed `travelmonth-44` had the concise discount only in `title` (`웰촌 체험상품 30% 할인`) while `benefit_text`, `policy.benefit_detail`, and API `amount` contained the long condition sentence.
- [x] RED check: `cd backend; python -m pytest tests/test_travelmonth_normalizer.py tests/test_policy_normalization.py -q` failed because `extract_benefit_value` did not accept title input and promotion fell back to the long condition sentence.
- [x] GREEN check: `cd backend; python -m pytest tests/test_travelmonth_normalizer.py tests/test_policy_normalization.py -q` passed with 19 tests.
- [x] Regression check: `cd backend; python -m pytest tests/test_travelmonth_parser.py tests/test_policy_db_service.py tests/test_region_recommendations.py -q` passed with 29 tests.
- [x] Frontend RED check: `cd frontend; npm test -- --run src/App.test.tsx -t "trailing benefit period"` failed because the mixed condition/period sentence rendered as one `운영 기간` item and no `이용 조건` group.
- [x] Frontend GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "trailing benefit period"` passed with 1 selected test.
- [x] Frontend regression check: `cd frontend; npm test -- --run src/App.test.tsx` passed with 91 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `git diff --check` passed with line-ending warnings only.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed.
- [x] Re-ran policy promotion in the backend container; `promoted_count` was 47.
- [x] Runtime smoke passed: `GET http://127.0.0.1:8000/api/health` returned `database: connected`, frontend `http://127.0.0.1:4173` returned HTTP 200, and Compose reported DB/backend healthy with frontend running.
- [x] `GET http://127.0.0.1:8000/api/policies/travelmonth-44` now returns `title: 웰촌 체험상품 30% 할인`, `amount: 최대 30%`, and the original condition sentence only in `summary`.
- [x] In-app browser check for `/policies/travelmonth-44` showed `최대 30% 혜택`, `운영 기간: 26년 4월 중순부터 5월 말`, and `이용 조건: 행사 기간 중 온라인 체험상품 예약 결제 후 사용 완료 참여자`.

Remaining risks:
- Existing stored source records keep their old `benefit_value_text` until collection is rerun; re-running policy promotion repairs user-facing policies from the stored title signal.
- If a future source title contains non-benefit percentages, the parser can overstate the benefit. Current known TravelMonth titles use percent wording as a benefit signal.

## 2026-05-23 Policy Detail Sticky CTA Gap

- [x] Investigation found the policy detail screen inherited `.service-layout .screen { padding-bottom: 100px; }`, which produced a 100px gap between `.sticky-cta` and `.bottom-tabs` at the bottom of the scroll container.
- [x] RED check: `cd frontend; npm run test:e2e -- --grep "sticky CTA"` failed with measured `gap: 100`.
- [x] GREEN check: `cd frontend; npm run test:e2e -- --grep "sticky CTA"` passed after removing the inherited bottom padding only for `.prototype-policy-detail-screen`.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `git diff --check` passed with line-ending warnings only.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed.
- [x] Runtime smoke passed: `GET http://127.0.0.1:8000/api/health` returned `database: connected`, frontend `http://127.0.0.1:4173` returned HTTP 200, and Compose reported DB/backend healthy with frontend running.
- [x] In-app browser check for `/policies/travelmonth-44` after scrolling measured CTA bottom and bottom tab top gap at 1px from rounding, visually attached above the bottom tabs.

Remaining risks:
- This fix is scoped to policy detail screens; other screens still intentionally keep their bottom padding for bottom tab clearance.

## 2026-05-23 Trip Linked Policy Removal

- [x] RED check: `cd backend; python -m pytest tests/test_trip_db_service.py -q -k "remove_policy_from_trip"; python -m pytest tests/test_trip_db_routes.py -q -k "remove_policy_from_trip"` failed before the repository/service/route delete path existed.
- [x] Backend GREEN/regression check: `cd backend; python -m pytest tests/test_trip_db_service.py tests/test_trip_db_routes.py -q -k "policy"` passed with 9 tests.
- [x] Frontend delete regression check: `cd frontend; npm test -- --run src/App.test.tsx -t "removes a linked policy"` passed after clearing the stale expected-saving fallback.
- [x] Full frontend regression check: `cd frontend; npm test -- --run src/App.test.tsx` passed with 92 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `docker compose -f compose.yaml config` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed.
- [x] Runtime smoke passed: `GET http://127.0.0.1:8000/api/health` returned `database: connected`, frontend `http://127.0.0.1:4173` returned HTTP 200, and Compose reported DB/backend healthy with frontend running.
- [x] Browser smoke for `/trips/36` confirmed the linked policy card still links to `/policies/local-vacation` and exposes a visible `삭제` button with accessible name `지역사랑 휴가지원 연결 삭제`.

Remaining risks:
- The delete endpoint returns the existing `TripPolicyResponse` shape instead of a fully recalculated `Trip`; the frontend clears the local saving fallback when the last linked policy is removed.

## 2026-05-23 Policy Requirement Detail Sections

- [x] RED check: `cd frontend; npm test -- --run src/App.test.tsx -t "splits policy requirements"` failed because `혜택 적용 조건` and `확인 필요 사항` sections did not exist and all `requirements` were rendered under `신청 대상`.
- [x] GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "splits policy requirements"` passed with 1 selected test after frontend-only requirement grouping and explanatory copy were added.
- [x] Policy detail regression check: `cd frontend; npm test -- --run src/App.test.tsx -t "policy detail section order"` passed with 26 selected tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] Full frontend regression check: `cd frontend; npm test -- --run src/App.test.tsx` passed with 93 tests.

Remaining risks:
- Requirement grouping is heuristic display logic over the existing `requirements` string array. It improves the current UI without changing API shape, but source-level structured eligibility/usage/confirmation fields remain a future backend/data normalization improvement.

## 남은 우선순위

- [x] Complete review and merge PR #17 into `develop` after the latest checks are green.
- [x] Prepare staging smoke handoff.
- [x] Merge the `chore/develop-release-handoff-2026-05-20` sync PR into `develop`.
- [x] Complete local collection and itinerary recommendation smoke automation.
- [ ] Run Cloudflare Tunnel full staging smoke during the release window.
- [ ] Verify SMTP delivery in staging.
- [ ] Verify OAuth provider credentials in staging.

## 주의사항

- Historical validation logs, prototype notes, and VPS-era runbook details are intentionally kept only in Git history.
- Documentation-only cleanup does not require frontend/backend test suites unless a code, API, schema, or runtime behavior changes.
- For release handoff, run the release gate in `docs/deployment-cicd/09-release-checklist.md` and record only the final evidence here, in the PR, or in the handoff note.

## 2026-05-23 Policy Source Audit And Sokcho Correction

- [x] Design saved to `docs/superpowers/specs/2026-05-23-policy-source-audit-design.md`.
- [x] Implementation plan saved to `docs/superpowers/plans/2026-05-23-policy-source-audit.md`.
- [x] RED check: `cd backend; python -m pytest tests/test_policy_source_audit.py -q` failed first because `scripts.audit_policy_sources` did not exist.
- [x] RED seed check: the same command then failed because `sokcho-stay` still used `속초 숙박 할인권` and the old portal-root source.
- [x] RED stale-document check: the same command then failed because reseeding an existing policy kept old `예약 내역` / `결제 영수증` documents.
- [x] GREEN check: `cd backend; python -m pytest tests/test_policy_source_audit.py -q` passed with 7 tests.
- [x] Targeted backend regression: `cd backend; python -m pytest tests/test_policy_source_audit.py tests/test_validate_policy_data.py tests/test_policy_data_validation.py -q` passed with 12 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed and DB/backend reported healthy.
- [x] Reseeded the running Docker DB with `docker compose -f compose.yaml exec -T backend python -m app.db.seed`.
- [x] Runtime smoke passed: `GET http://127.0.0.1:8000/api/health` returned `database: connected`.
- [x] Runtime API check for `GET http://127.0.0.1:8000/api/policies/sokcho-stay` returned `title: 속초 워케이션 숙박 지원`, `tag: 워케이션`, official URL `https://www.sokcho.go.kr/sc/portal/sokchonews/pressrelease?articleSeq=806017`, apply URL `https://naver.me/FK5QrxZe`, requirements `주중 워케이션 / 참여 숙소 / 사전 신청 / 여행자 보험 가입 시 할인`, and documents `신청 내역 / 숙박 예약 정보 / 여행자 보험 가입 여부`.
- [x] Current API policy list audit checked 74 loaded policies; none were classified as `invalid_source` or `missing_source`. All 74 are `needs_review` because the offline audit did not fetch or compare source page body text.

Remaining risks:
- The Sokcho official URL is the closest Sokcho city-site detail page found for this policy shape, but it is a 2025 notice. A 2026 current-program page exists outside the Sokcho city domain, so a future source-enrichment pass should decide whether to prefer current third-party operating pages or strict city-domain official notices.
- The new audit utility validates URL/source quality offline by default. Full `verified` status requires supplying extracted source text or adding a controlled fetch/extraction step.

## 2026-05-23 Legacy Dummy Policy Removal

- [x] RED check: `cd backend; python -m pytest tests/test_policy_source_audit.py -q` failed because backend seed data still included `local-vacation`, `sokcho-stay`, `busan-cashback` and the dgtour crawler still reserved those slugs.
- [x] Removed the three hardcoded dummy policies from backend seed data and frontend development fallback data.
- [x] Added reseed cleanup so existing DB rows for `local-vacation`, `sokcho-stay`, and `busan-cashback` are deleted together with trip links, saved policies, notification deliveries, and policy documents.
- [x] Removed the three legacy dummy slugs from frontend featured policy/icon/visual fallback settings and from dgtour crawler reserved slugs.
- [x] GREEN check: `cd backend; python -m pytest tests/test_policy_source_audit.py -q` passed with 8 tests.
- [x] Targeted backend regression: `cd backend; python -m pytest tests/test_policy_source_audit.py tests/test_validate_policy_data.py tests/test_policy_data_validation.py -q` passed with 13 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `git diff --check` passed with line-ending warnings only.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed with DB/backend healthy and frontend running.
- [x] Reseeded the running Docker DB with `docker compose -f compose.yaml exec -T backend python -m app.db.seed`.
- [x] Runtime DB check returned 0 rows for `local-vacation`, `sokcho-stay`, and `busan-cashback`.
- [x] Runtime API check for `GET http://127.0.0.1:8000/api/policies` returned 71 policies and no legacy dummy slugs.
- [x] Runtime smoke passed: backend health and frontend root returned HTTP 200.

Remaining risks:
- Historical note: this risk was addressed by the later stale-reference cleanup section; general backend test fixtures now use neutral `fixture-*` slugs, while legacy slug mentions remain only in deletion assertions and archived/history context.

## 2026-05-23 Dgtour Generic Benefit Display

- [x] Root cause check found `dgtour-밀양-1` stores a generic `amount` value of `혜택 제공`; policy detail fallback then rendered it as `혜택 제공 혜택`.
- [x] RED check: `cd frontend; npm test -- --run src/App.test.tsx -t "dgtour summary"` failed with `혜택 제공 혜택` in the support section.
- [x] Detail display now treats generic amount values such as `혜택 제공` as labels, not benefit sentences, and uses the policy summary as the core benefit item.
- [x] GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "dgtour summary"` passed with 1 selected test.
- [x] Related CTA fixture check: `cd frontend; npm test -- --run src/App.test.tsx -t "official policy link"` passed with 3 selected tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `docker compose -f compose.yaml build frontend` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate frontend` passed with DB/backend healthy and frontend running.
- [x] Runtime Playwright smoke for `/policies/dgtour-%EB%B0%80%EC%96%91-1` showed `디지털관광주민증 혜택` and the policy summary under `핵심 혜택`, and `containsBad=false` for `혜택 제공 혜택`.

Remaining risks:
- None for the dgtour generic benefit display. A later stale-cleanup pass updated the full App test suite away from removed runtime dummy policy routes.

## 2026-05-23 Current Spec Stale Cleanup

- [x] Implementation plan saved to `docs/superpowers/plans/2026-05-23-current-spec-stale-cleanup.md`.
- [x] API golden examples now use the real collected policy `dgtour-밀양-1` instead of removed dummy policy `local-vacation`.
- [x] Frontend route smoke/e2e examples now use `/policies/dgtour-%EB%B0%80%EC%96%91-1`.
- [x] `frontend/src/App.test.tsx` no longer navigates runtime detail flows to `/policies/local-vacation`; policy-list tests use explicit fixtures and link assertions tolerate encoded Korean slugs.
- [x] Current work and next work docs were updated to the 2026-05-23 post-dummy-removal state.
- [x] RED check observed before cleanup: `cd frontend; npm test -- --run src/App.test.tsx` failed with stale `/api/policies/local-vacation` 404s.
- [x] GREEN check: `cd frontend; npm test -- --run src/App.test.tsx --reporter=dot` passed with 94 tests.

Remaining risks:
- Some backend unit tests and historical plan/spec documents still mention legacy dummy slugs as synthetic fixtures, deletion/audit assertions, or archived context. Those are not runtime seed records.

## 2026-05-23 Remaining Stale Reference Cleanup

- [x] `frontend/AGENTS.md` authenticated smoke route now points at the real collected policy path `/policies/dgtour-%EB%B0%80%EC%96%91-1` instead of `/policies/local-vacation`.
- [x] General backend unit tests now use neutral fixture slugs (`fixture-policy`, `fixture-busan-cashback`) instead of removed runtime dummy policy slugs.
- [x] Legacy dummy slug references remain only where intentional: DB reseed cleanup constants, policy source audit deletion assertions, current docs that explain dummy removal, `CHECKLIST.md` historical logs, and archived plan/spec examples.
- [x] Historical source-audit and itinerary plan/spec documents now include notes that old dummy slug examples are superseded or archival.
- [x] `cd backend; python -m pytest tests/test_policy_db_service.py tests/test_policy_error_paths.py tests/test_trip_db_routes.py tests/test_trip_db_service.py tests/test_notification_dispatch.py tests/test_notification_delivery_service.py tests/test_kakao_alimtalk.py tests/test_validate_policy_data.py -q` passed with 128 tests.
- [x] `cd backend; python -m pytest -p no:cacheprovider --basetemp .pytest-tmp -q` passed with 335 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx --reporter=dot` passed with 94 tests.
- [x] Initial `cd frontend; npm run test:e2e` found an overly strict sticky CTA assertion comparing `0` with JavaScript `-0`; the test now uses numeric closeness for the same zero-gap layout invariant.
- [x] `cd frontend; npm run test:e2e` passed with 8 Playwright backend-mode tests.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `docker compose -f compose.yaml build` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate` passed with DB/backend healthy and frontend running.
- [x] Docker runtime checks passed: backend `/api/health` returned `database=connected`, frontend root returned HTTP 200, and the running DB returned 0 rows for `local-vacation`, `sokcho-stay`, and `busan-cashback`.
- [x] `python -m json.tool .agent/evals/api-contract-golden.json` passed.
- [x] `git diff --check` passed with line-ending warnings only.

Remaining risks:
- No known remaining validation gap for the stale-reference cleanup and Docker/E2E gate. Historical log entries still mention old dummy slugs by design.

## 2026-05-23 Trip Confirmation Lock

- [x] Design spec saved to `docs/superpowers/specs/2026-05-23-trip-confirmation-lock-design.md`.
- [x] Implementation plan saved to `docs/superpowers/plans/2026-05-23-trip-confirmation-lock.md`.
- [x] RED check observed: `cd frontend; npm test -- --run src/App.test.tsx -t "confirmed trip"` failed before implementation because confirmed trip detail still exposed edit controls and no confirmation-cancel action existed.
- [x] Trip detail now treats `confirmed` trips as read-only for owner/editor users, hides place/policy edit controls, and exposes `확정취소` to restore `draft` status through the existing trip status API.
- [x] Focused GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "confirmed trip"` passed with 2 selected tests.
- [x] Full frontend regression check: `cd frontend; npm test -- --run src/App.test.tsx --reporter=dot` passed with 96 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm run test:e2e` passed with 9 Playwright backend-mode tests, including the confirmed-trip lock/cancel flow.
- [x] `python -m json.tool .agent\evals\api-contract-golden.json` passed.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `git diff --check` passed with line-ending warnings only.
- [x] Browser smoke on `http://127.0.0.1:5173/trips/{createdId}` verified a confirmed trip hides add/drag controls, exposes `확정취소`, and restores `.dashed` plus `.drag-handle` controls after canceling confirmation.
- [x] `docker compose -f compose.yaml build frontend` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate frontend` passed with DB/backend healthy and frontend running.
- [x] Runtime smoke passed: backend `/api/health` returned `database=connected` and frontend `http://127.0.0.1:4173` returned HTTP 200.

Remaining risks:
- No known remaining validation gap for the trip confirmation lock behavior.

## 2026-05-23 Trip Detail Confirm Action

- [x] Trip detail now exposes a `확정하기` action for owner/editor users when a trip is still `draft`.
- [x] The action uses the existing `appDataApi.updateTripStatus(trip.id, { status: "confirmed" })` boundary and then reuses the confirmed-trip read-only lock state.
- [x] Viewer users still do not see trip confirmation controls in trip detail.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "draft trip detail"` passed with 7 selected tests, including the new detail confirm regression.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx --reporter=dot` passed with 97 tests.
- [x] `docker compose -f compose.yaml build frontend` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate frontend` passed with DB/backend healthy and frontend running.
- [x] Runtime smoke passed: backend `/api/health` returned `database=connected`, frontend `http://127.0.0.1:4173/` returned HTTP 200, and Playwright verified `확정하기` appears on a draft detail, switches to `확정취소`, and locks edit controls after confirmation.
- [x] Smoke-created trip `89` was deleted after verification.

Remaining risks:
- No known remaining validation gap for the trip detail confirm action.

## 2026-05-23 Trip Detail Status Card Color

- [x] B wireframe direction selected: `draft` detail status uses yellow styling and `confirmed` detail status uses green styling, matching the `/trips` list status language.
- [x] RED check: `cd frontend; npm test -- --run src/App.test.tsx -t "confirms draft trip detail"` failed because the draft detail status panel had only `trip-status-panel` and no `draft` state class.
- [x] Trip detail status panel now renders `trip-status-panel draft` for 작성 중 and `trip-status-panel confirmed` for 확정됨.
- [x] Scoped CSS gives draft a yellow background/left rule and confirmed a green background/left rule; the status action buttons now match each state color.
- [x] Focused GREEN check: `cd frontend; npm test -- --run src/App.test.tsx -t "confirms draft trip detail"` passed with 3 selected tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `docker compose -f compose.yaml build frontend` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate frontend` passed with DB/backend healthy and frontend running.
- [x] Runtime Playwright smoke verified draft panel `background=rgb(255, 249, 232)`, `borderLeftColor=rgb(225, 161, 0)`, and confirm button brown; after confirmation, panel `background=rgb(238, 249, 241)`, `borderLeftColor=rgb(31, 139, 76)`, and cancel button white/green.
- [x] Smoke-created trip `91` was deleted after verification.

Remaining risks:
- No known remaining validation gap for the trip detail status card color.

## 2026-05-23 Trip List Status Display

- [x] `/trips` itinerary cards no longer render the `.trip-confirm-panel` confirmation/save block.
- [x] Draft itinerary cards now render the status tag with `tag yellow` while confirmed cards keep the existing confirmed status styling.
- [x] Removed now-unused list confirmation state and stale `.trip-confirm-panel` / `.trip-confirm-check` CSS.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "draft trips"` passed with 6 selected tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `python -m json.tool .agent\evals\api-contract-golden.json` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx --reporter=dot` passed with 96 tests.
- [x] `cd frontend; npm run test:e2e` passed with 9 Playwright backend-mode tests.
- [x] `docker compose -f compose.yaml config --quiet` passed.
- [x] `git diff --check` passed with line-ending warnings only.
- [x] `docker compose -f compose.yaml build frontend` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] `docker compose -f compose.yaml up -d --force-recreate frontend` passed with DB/backend healthy and frontend running.
- [x] Runtime smoke passed: backend `/api/health` returned `database=connected`, frontend `http://127.0.0.1:4173` returned HTTP 200, and browser DOM showed `panelCount=0`, `checkCount=0`, and draft status tag `className=tag yellow`.

Remaining risks:
- No known remaining validation gap for the trip list status display.

## 2026-05-23 Figma Design System Foundations

- [x] Design spec saved to `docs/superpowers/specs/2026-05-23-travel-hunter-figma-design-system-design.md`.
- [x] Implementation plan saved to `docs/superpowers/plans/2026-05-23-travel-hunter-figma-design-system.md`.
- [x] Figma file created: `Travel Hunter DS v1` at `https://www.figma.com/design/bvSkBGlFoFvgnlnVoWYfEk`.
- [x] Figma discovery verified the file had one blank page, zero local variables, zero text styles, and zero effect styles before creation.
- [x] Phase 1 foundations created 4 variable collections: primitives, color, spacing, radius.
- [x] Phase 1 foundations created 67 variables: 33 primitive colors, 22 semantic colors, 7 spacing/size values, and 5 radius values.
- [x] Semantic color variables use primitive variable aliases; validation found 22 aliases and 0 broken aliases.
- [x] Validation found 0 missing WEB code syntax entries and 0 non-primitive variables without scopes.
- [x] Text styles created: Title, Section Title, Card Title, Body, Meta, Badge.
- [x] Effect styles created: Shadow/xs, Shadow/sm, Shadow/md.
- [x] Figma build state saved to `.agent/figma-design-system-state.json`.

Remaining risks:
- No code CSS refactor has been applied yet. Some newly defined semantic CSS variable names, such as `--status-draft-bg` and `--color-bg-card`, are Figma/code handoff targets and still need a later frontend token cleanup before Dev Mode and CSS are fully aligned.
- Phase 2 file structure and component pages are pending user checkpoint approval.

## 2026-05-23 Figma Design System Phase 2 Structure

- [x] Phase 2 created the Figma page skeleton with 11 pages: Cover, Getting Started, Foundations, component separator, Status, Button, Tag Badge, Card, Bottom Tab, screen separator, and Screens / Trips.
- [x] Cover page now has a branded `Travel Hunter DS v1` 1440 x 900 frame.
- [x] Getting Started page now documents the token -> component -> screen workflow and the code alignment note.
- [x] Foundations page now documents color, typography, spacing, radius, and elevation sections from the Phase 1 tokens/styles.
- [x] Component placeholder pages were added for Status, Button, Tag Badge, Card, and Bottom Tab to mark the Phase 3 creation order.
- [x] Screens / Trips now has a handoff placeholder for comparing `/trips` and trip detail states after components exist.
- [x] Figma validation returned `requiredPagesPresent=true`, `pageCount=11`, and no missing required pages.
- [x] Figma build state updated in `.agent/figma-design-system-state.json`.

Remaining risks:
- Component variants are not created yet. Per the Figma design-system workflow, Phase 3 should start with the Status component family and stop for review after its screenshot.
- Several Figma semantic CSS names remain handoff targets until the frontend token cleanup adds matching CSS variables.

## 2026-05-23 Figma Design System Phase 3 Status

- [x] Searched available Figma design-system assets for reusable status/tag/panel components; no reusable component or token result was returned.
- [x] Status page placeholder was replaced with `Status / Documentation`, including usage rules for Draft, Confirmed, Benefit, and Danger states.
- [x] Created `Status Tag` component set with 4 variants: Draft, Confirmed, Benefit, Danger.
- [x] Created `Status Panel` component set with 2 variants: Draft and Confirmed.
- [x] Status Tag uses state-specific Korean labels: `작성 중`, `확정됨`, `예상 혜택`, `삭제 필요`.
- [x] Status Panel uses draft/confirmed Korean copy and action labels: `확정하기`, `확정취소`.
- [x] Visual validation screenshot exposed an issue where shared text properties forced all variants to the same label; those text properties were removed and state-specific labels were restored.
- [x] Visual validation screenshot exposed a Korean body rendering issue in the confirmed panel; panel body text now uses `NanumGothic Regular` fallback for reliable Korean rendering.
- [x] Final Figma structural validation returned `Status Tag` variant count 4 and `Status Panel` variant count 2.
- [x] Figma build state updated in `.agent/figma-design-system-state.json`.

Remaining risks:
- Status components are ready for review, but no code CSS/component refactor has been applied yet.
- The next Phase 3 component should be Button after user approval of the Status component screenshot.

## 2026-05-23 Figma Design System Phase 3 Button

- [x] Searched available Figma design-system assets for reusable button components; no reusable component or token result was returned.
- [x] Button page placeholder was replaced with `Button / Documentation`.
- [x] Created `Button` component set with 16 variants.
- [x] Button axes are `Size=Small/Medium`, `Style=Primary/Secondary/Quiet/Danger`, and `State=Default/Disabled`.
- [x] Button labels use the `Label` text component property so instances can change action text.
- [x] Button variants bind fills, text colors, strokes, padding, and radius to the Phase 1 foundation variables.
- [x] Visual validation screenshot confirmed visible size differences, style differences, and disabled-state dimming.
- [x] Final Figma structural validation returned variant count 16 and the expected component property definitions.
- [x] Figma build state updated in `.agent/figma-design-system-state.json`.

Remaining risks:
- Button components are ready for review, but no code CSS/component refactor has been applied yet.
- The next Phase 3 component should be Tag/Badge, then Card, then Bottom Tab.

## 2026-05-23 Figma Design System Phase 3 Remaining Components And Screen

- [x] Created `Tag Badge / Documentation` and `Tag Badge` component set with 4 variants: Neutral, Primary, Benefit, Muted.
- [x] Tag Badge labels use `NanumGothic Bold` after visual validation showed Inter Korean text did not render reliably in the screenshot.
- [x] Created `Card / Documentation` and `Card` component set with 4 variants: Base, Draft, Confirmed, Benefit.
- [x] Card text uses `NanumGothic` after visual validation showed Korean title/tag rendering gaps with Inter.
- [x] Created `Bottom Tab / Documentation` and `Bottom Tab Item` component set with 2 variants: Inactive and Active.
- [x] Created `Screens / Trips` comparison frame for draft yellow and confirmed green state language across cards, benefit summary, and bottom tabs.
- [x] Final Figma QA found 11 pages, 6 component sets, 67 variables, 6 text styles, and 3 effect styles.
- [x] Final Figma QA found all required component sets present: Status Tag, Status Panel, Button, Tag Badge, Card, Bottom Tab Item.
- [x] Final Figma QA found no missing WEB code syntax and no non-primitive variables missing scopes.
- [x] Figma build state updated in `.agent/figma-design-system-state.json`.

Remaining risks:
- Figma design-system creation is complete for the agreed v1 scope. Code cleanup is still a separate implementation task: frontend CSS tokens should be aligned with the newly defined semantic Figma tokens before applying component-level refactors.

## 2026-05-23 Figma Semantic Token Code Alignment

- [x] Added Figma handoff semantic CSS variables to `frontend/src/styles/tokens.css`: `--color-bg-*`, `--color-text-*`, `--color-border-*`, `--color-action-*`, and `--status-*`.
- [x] Replaced hardcoded trip status panel and status tag colors in `frontend/src/styles/app.css` with the new semantic variables.
- [x] Confirmed no remaining hardcoded Figma status hex values in `frontend/src/styles/app.css` for `#fff9e8`, `#e1a100`, `#7a4b00`, `#b66f00`, `#eef9f1`, `#1f8b4c`, `#15803d`, `#e0f2fe`, or `#0369a1`.
- [x] `cd frontend; npm run typecheck` passed.
- [x] Focused frontend regression: `cd frontend; npm test -- --run src/App.test.tsx -t "draft trips"` passed with 7 selected tests, including the draft trip badge and draft-detail confirmation lock flow.

Remaining risks:
- CSS token alignment is intentionally scoped to the trip/status surfaces covered by the Figma v1 work. Many older app surfaces still use historical literal colors and should be cleaned up in separate, lower-risk passes.

## 2026-05-23 Policy-Wide Design System Refactor

- [x] Added shared frontend UI primitives for semantic surfaces and status panels: `SurfaceCard`, `StatusPanel`, and typed tag tones.
- [x] Aligned policy list/detail, trip list/detail, and bottom tab surfaces with the Figma v1 design language without changing API contracts or backend data flow.
- [x] `cd frontend; npm run typecheck` passed.
- [x] Focused frontend regression passed: `design-system`, `viewer trips as read-only`, `draft trips`, `policy list`, `dgtour summary`, `normalized official benefit detail`, and `benefit summaries`.
- [x] `cd frontend; npm run build` passed.
- [x] `git diff --check` passed for touched frontend files; Git reported existing CRLF normalization warnings only.
- [x] Responsive visual QA passed at 360, 390, 430, 1024, and 1440px for `/policies`, `/policies/dgtour-%EB%B0%80%EC%96%91-1`, `/trips`, and one real trip detail route. Checks covered horizontal overflow, bottom-tab vertical centering, DS card presence, policy detail benefit/requirement cards, trip status panel, and sticky CTA alignment above bottom tabs.

Remaining risks:
- Visual QA used a local Vite preview on `127.0.0.1:51846` with Chromium local web-security disabled because the running backend CORS configuration only allowed the Docker frontend origin. The rendered app still used the running FastAPI/PostgreSQL backend and the built frontend assets.

## 2026-05-24 Frontend Design Cleanup Review

- [x] Removed temporary visual QA artifact `frontend/tmp-policy-detail.png`.
- [x] Repaired mojibake in visible bottom-tab labels and policy/trip card copy in `frontend/src/components/AppLayout.tsx` and `frontend/src/components/cards.tsx`.
- [x] Confirmed no remaining mojibake pattern matches in those two files.
- [x] `cd frontend; npm run typecheck` passed.
- [x] Focused frontend regressions passed: `policy list` and `draft trips`.
- [x] `docker compose -f compose.yaml up -d --build frontend` passed; frontend image build ran `npm run typecheck && vite build`.
- [x] Runtime smoke passed: backend `/api/health` returned `database=connected`, Docker backend/db are healthy, and frontend `http://127.0.0.1:4173` returned HTTP 200.

Remaining risks:
- The worktree still contains many unrelated backend/docs/frontend changes from earlier tasks. Commit grouping should separate the design-system cleanup from policy source/audit and API contract changes.

## 2026-05-24 Core Screen Design System Expansion

- [x] Added repo-local Figma/code mappings for DS primitives and core screen patterns.
- [x] Added `HomeRail`, `HomeSectionHeader`, `AuthFormShell`, `ProfilePanel`, and `ProfileSetupStep` frontend pattern components.
- [x] Aligned `/home`, `/mypage`, auth/nickname, and `/profile-setup` surfaces with DS pattern components.
- [x] Restored visible Korean copy on scoped screens and repaired shared `LoadingState`, `ErrorState`, and `ConfirmDialog` copy.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx` passed: 101 tests.
- [x] `cd frontend; npm run build` passed.
- [x] Responsive visual QA passed at 360/390/430/1024/1440 for `/home`, `/mypage`, `/login`, `/signup`, `/nickname-setup`, and `/profile-setup` using Playwright with API route stubs.

Remaining risks:
- Figma mapping is repo-local documentation until official Code Connect CLI/package wiring is added.

## 2026-05-24 Mojibake Visible Text Cleanup

- [x] Added frontend mojibake guard: `cd frontend; npm run test:mojibake` passed with `No mojibake-like frontend text found.`
- [x] Removed the remaining CSS pseudo-content mojibake labels for the trip create screen.
- [x] Removed the remaining policy detail mojibake fallback fragments without changing policy data flow or API calls.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test` passed, including the mojibake guard and 109 Vitest tests.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Backend health passed: `http://127.0.0.1:8000/api/health` returned HTTP 200 with `database=connected`.
- [x] Frontend health passed: `http://127.0.0.1:4173` returned HTTP 200.
- [x] Browser visual verification passed for `/home`, `/policies`, `/policies/dgtour-%EB%B0%80%EC%96%91-1`, `/trips`, `/trips/36`, and `/mypage`.
- [x] Visual QA screenshots were saved under `tmp/mojibake-final/` and showed readable Korean labels on the checked screens.

Remaining risks:
- Database policy records were not bulk edited. If future rendered policy data shows mojibake, trace the exact policy record and source URL before correcting stored data.
- Docker frontend build still reports the existing npm audit notice for one moderate severity dependency issue; this was not introduced or changed by the mojibake cleanup.
