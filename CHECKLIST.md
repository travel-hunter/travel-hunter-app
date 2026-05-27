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

## 2026-05-24 My Page Settings Menu Text Fix

- [x] Reproduced the issue on `/mypage` at 360px: settings rows showed duplicated visible text such as `알림알림 설정` because the decorative icon slot contained text labels.
- [x] Added a regression assertion that `.prototype-menu-icon` does not contribute visible text content.
- [x] Replaced the settings-row text labels with `lucide-react` icons and centered the icon slot.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "shows saved policies on my page"` failed before the fix and passed after the fix.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build frontend` passed.
- [x] Backend health passed: `http://127.0.0.1:8000/api/health` returned HTTP 200 with `database=connected`.
- [x] Frontend health passed: `http://127.0.0.1:4173` returned HTTP 200.
- [x] Browser visual verification passed at 360px for `/mypage`; settings rows now render as `알림 설정`, `공지사항 / FAQ`, `이용약관`, `개인정보처리방침`, and `로그아웃` without horizontal overflow.

Remaining risks:
- Visual verification used the Docker-served app and an authenticated test user. Other profile data states were not exhaustively reviewed because the bug was isolated to static settings-menu labels.

## 2026-05-24 Trip Linked Policy Route-State Delete Fix

- [x] Root cause confirmed: backend `DELETE /api/trips/{tripId}/policies/{policySlug}` was succeeding, but trip detail re-added the just-attached policy from React Router `location.state.linkedPolicy` after local trip state removed it.
- [x] Added a regression test for deleting a route-state linked policy from trip detail.
- [x] Trip detail now tracks removed route-state policy slugs and excludes them from the display fallback after a successful delete.
- [x] `cd frontend; npm test -- --run src/App.test.tsx` passed with 102 tests.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed with DB/backend/frontend running.
- [x] Visual Playwright verification passed against Docker frontend/backend: a route-state `제주 디지털관광주민증 혜택` card on `/trips/86` went from 1 visible card before delete to 0 after delete, and the linked-policy empty state was shown. Screenshots saved under `tmp/trip-linked-policy-delete/`.

Remaining risks:
- `/trips/48` currently returned 404 in the local Docker database, so runtime visual verification used an existing editable draft trip (`/trips/86`) with the same route-state linked-policy path.

## 2026-05-24 Trip Confirmation UI Removal

- [x] Confirmed product direction B: remove trip confirmation actions and detail status panel, but keep linked policy cards and policy-to-trip flows.
- [x] Added design spec and implementation plan under `docs/superpowers/specs/2026-05-24-trip-confirmation-removal-design.md` and `docs/superpowers/plans/2026-05-24-trip-confirmation-removal.md`.
- [x] Trip detail no longer renders `확정하기`, `확정취소`, or `일정 확정 상태`.
- [x] Owner/editor trip editing is now role-based on trip detail, so persisted `confirmed` status no longer hides place add/edit/delete, drag handles, or linked policy removal.
- [x] Viewer trips remain read-only by role.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "confirmed trip"` failed before implementation and passed after implementation.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx` passed with 102 tests.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Runtime health passed: backend `http://127.0.0.1:8000/api/health` returned HTTP 200, and frontend `http://127.0.0.1:4173` returned HTTP 200.
- [x] Visual Playwright verification passed on Docker `/trips/36`: confirmed owner trip showed no confirmation status region/buttons, while `.dashed`, `.drag-handle`, and `.linked-policy-remove` were visible. Screenshot saved under `tmp/trip-confirmation-removal/`.

Remaining risks:
- Backend `Trip.status` and `PATCH /api/trips/{trip_id}/status` remain for compatibility and older data; the current frontend simply stops exposing confirmation controls.

## 2026-05-24 Trip List Draft Badge Removal

- [x] Removed the remaining `/trips` list status UI from trip cards: the thumbnail `작성 중`/`확정` chip and the bottom `작성 중`/`확정됨` status tag.
- [x] Kept the expected benefit tag on trip list cards.
- [x] Updated frontend regression tests to assert that trip list cards do not expose draft/confirmed status badges.
- [x] Updated `docs/current-work-spec.md` and `docs/mvp-api-contract.md` to match the frontend behavior.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "renders trips without list confirmation controls or status badges"` passed.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx` passed with 102 tests.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Visual Playwright verification passed on Docker `/trips`: 31 trip cards rendered, `.trip-dday-chip` count was 0, draft/confirmed status tag count was 0, and 31 expected benefit tags remained. Screenshot saved under `tmp/trip-list-status-removal/`.

Remaining risks:
- Backend `Trip.status` and status update API remain for compatibility, but the current `/trips` list no longer exposes status labels or controls.

## 2026-05-24 My Page DS Card And Tab Alignment

- [x] Added implementation plan under `docs/superpowers/plans/2026-05-24-mypage-ds-card-tabs.md`.
- [x] Added DS-style my page patterns for section headers and favorite policy cards.
- [x] Replaced the `/mypage` favorite policy row with `FavoritePolicyCard`, using a compact one-character marker, truncating title/amount copy, and a non-wrapping remove button.
- [x] Normalized bottom tab grid sizing with `repeat(4, minmax(0, 1fr))`, explicit auto width, and centered tab content.
- [x] Updated the my page saved-policy regression test for the DS card contract.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "shows saved policies on my page and removes them"` passed after the expected initial red test and implementation.
- [x] `cd frontend; npm test -- --run src/App.test.tsx` passed with 102 tests.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Visual Playwright verification passed on Docker `/mypage` at 390px: 1 DS favorite card, 0 overflowing cards, 0 split thumb markers, 4 bottom tabs, and tab widths `[94, 94, 94, 94]`. Screenshot saved under `tmp/mypage-ds-card-tabs/`.

Remaining risks:
- Visual verification used one saved policy in the local Docker database. Empty and error states are covered by existing tests but were not separately screenshot-reviewed in this pass.

## 2026-05-24 My Page Favorite Emoji Thumbnails

- [x] Added implementation plan under `docs/superpowers/plans/2026-05-24-mypage-favorite-emoji-thumbnails.md`.
- [x] Replaced the one-character Korean favorite thumbnail markers with policy-nature emoji mapping.
- [x] Prioritized digital tourism resident card, ticket, pass, admission, and experience signals as `🎫` before secondary discount targets such as lodging or transport.
- [x] Kept favorite card truncation and fixed thumbnail slot behavior unchanged.
- [x] Updated the my page saved-policy regression test to reject the old `혜` marker and expect `🎫` for the digital tourism resident card policy.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "shows saved policies on my page and removes them"` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx` passed with 102 tests.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Visual Playwright verification passed on Docker `/mypage` at 390px: favorite card icons were `🎫` for both digital tourism resident card policies, no old `혜` marker was visible, and no favorite card overflow was detected. Screenshot saved under `tmp/mypage-favorite-emoji-thumbnails/`.

Remaining risks:
- Emoji rendering appearance can vary slightly by OS/browser font, but the fixed square thumbnail slot prevents text wrapping and overflow.

## 2026-05-24 My Page Large Avatar Shadow Removal

- [x] Scoped the large avatar style so `<div class="avatar large">` no longer inherits the base avatar shadow.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Visual Playwright verification passed on Docker `/mypage` at 390px: `.prototype-mypage-screen .avatar.large` rendered text `야` with computed `box-shadow: none`. Screenshot saved under `tmp/mypage-avatar-shadow/`.

Remaining risks:
- None identified for this scoped CSS change.

## 2026-05-24 My Page Profile Edit Button Alignment

- [x] Moved the profile edit action into the avatar/name row so it sits next to the profile content it edits.
- [x] Styled the edit action as a compact ghost button matching the favorite policy remove button sizing.
- [x] Kept the profile text area flexible so long names can shrink without resizing the edit button.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Visual Playwright verification passed on Docker `/mypage` at 390px: the edit button measured `53x36`, was aligned with the avatar row, opened the profile editor, and the avatar still had `box-shadow: none`. Screenshot saved under `tmp/mypage-profile-edit-button/`.

Remaining risks:
- None identified for this scoped layout change.

## 2026-05-24 My Page Profile Hero C Layout

- [x] Reworked the my page profile card to match option C: removed the visible `프로필` heading, kept the edit action in the avatar/name row, and used a travel-style badge instead of the nickname first-letter avatar.
- [x] Added profile preference chips for region, style, and budget inside the profile card.
- [x] Changed the my page screen background to a top point-color band that fades into a white page surface.
- [x] Added a regression assertion that the saved-policy my page flow no longer renders the visible profile heading and renders the style badge.
- [x] Verified the RED step: the updated focused test first failed because the legacy `프로필` heading was still rendered.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "shows saved policies on my page and removes them"` passed after implementation.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] Visual Playwright verification passed on Docker `/mypage` at 360, 390, 430, 1024, and 1440 px: no legacy profile head, badge rendered, 3 preference chips rendered, compact edit button stayed `53x36`, top gradient was applied, and no horizontal overflow was detected. Screenshots saved under `tmp/mypage-profile-hero-c/`.
- [x] `cd frontend; npm test` passed with 110 tests.
- [x] Centered the profile badge emoji with flex alignment and `line-height: 1`.
- [x] `cd frontend; npm run typecheck` passed after the badge centering change.
- [x] `cd frontend; npm run build` passed after the badge centering change.
- [x] `docker compose -f compose.yaml up -d --build` passed after the badge centering change.
- [x] Visual Playwright verification passed on Docker `/mypage` at 390 px: `.prototype-profile-badge` computed `display: flex`, `align-items: center`, and `justify-content: center`. Screenshot saved under `tmp/mypage-profile-badge-centered/`.
- [x] Replaced the profile badge emoji with a centered Lucide vector icon because the emoji glyph was visually off-center despite centered layout styles.
- [x] `cd frontend; npm run typecheck` passed after the vector badge change.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "shows saved policies on my page and removes them"` passed after the vector badge change.
- [x] `cd frontend; npm run build` passed after the vector badge change.
- [x] `docker compose -f compose.yaml up -d --build` passed after the vector badge change.
- [x] Visual Playwright verification passed on Docker `/mypage` at 390 px: vector badge measured `54x54`, icon measured `24x24`, and icon center deltas were `0,0`. Screenshot saved under `tmp/mypage-profile-badge-vector-centered/`.

Remaining risks:
- The badge is currently derived from travel style text. If a real profile photo/upload field is added later, the card should prefer that media over the fallback badge.

## 2026-05-24 Bottom Tabs Responsive Width

- [x] Confirmed root cause: `.bottom-tabs` was fixed-positioned and capped by `max-width: var(--app-width)`, while `.service-layout` expands to 760px and 820px on wider breakpoints.
- [x] Updated `.bottom-tabs` to inherit the responsive layout width and removed the 390px max-width cap.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "renders multiple saved trips"` passed.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] In-app browser verification passed on Docker `/trips`: current viewport measured `.service-layout` 760px and `.bottom-tabs` 760px with no horizontal overflow.
- [x] Playwright visual verification passed on Docker `/trips` at 360, 390, 430, 1024, and 1440 px: bottom tab width matched the responsive service layout width at every viewport and no horizontal overflow was detected. Screenshots saved under `tmp/bottom-tabs-responsive/`.

Remaining risks:
- On narrow desktop/headless mobile-sized screenshots with a visible vertical scrollbar, the fixed tab can report a small negative left offset while still matching layout width and avoiding horizontal overflow. The original fixed 390px desktop-width issue is resolved.

## 2026-05-24 Auth Compass Brand Mark

- [x] Saved implementation plan under `docs/superpowers/plans/2026-05-24-auth-compass-brand-mark.md`.
- [x] Replaced the auth logo's plain `TH` text with a reusable SVG compass `BrandMark`.
- [x] Styled the logo as the selected B option: pale app-icon surface, red compass ring, red/mint two-tone needle, and subtle primary shadow.
- [x] Added a login-screen regression assertion that `.brand-mark-compass` renders and `.prototype-login-logo` no longer contains `TH`.
- [x] Verified RED step: `cd frontend; npm test -- --run src/App.test.tsx -t "renders the prototype login screen"` first failed because `.brand-mark-compass` was absent.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t "renders the prototype login screen"` passed after implementation.
- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm run build` passed.
- [x] `docker compose -f compose.yaml up -d --build` passed.
- [x] In-app browser verification passed on Docker `/login`: logo measured `72x72`, compass SVG measured `50x50`, center deltas were `0,0`, `TH` text was absent, and no horizontal overflow was detected.
- [x] Playwright visual verification passed on Docker `/login` at 360, 390, 430, 1024, and 1440 px with centered compass logo and no horizontal overflow. Screenshots saved under `tmp/auth-compass-logo/`.

Remaining risks:
- The compass is implemented as inline SVG/CSS in code. A Figma component and Code Connect mapping can be added later if the brand mark should become part of the shared design library.

## 2026-05-24 Figma Brand Mark Component

- [x] Inspected existing Figma DS file `Travel Hunter DS v1` (`bvSkBGlFoFvgnlnVoWYfEk`) before writing.
- [x] Confirmed no reusable `compass`, `brand mark`, or logo component exists in the file or available design-system search results.
- [x] Created Figma page `Components / Brand Mark`.
- [x] Created `Brand Mark / Documentation`, `Brand Mark / Compass`, and `Brand Mark / Auth Preview` in Figma.
- [x] Bound the Figma component shell to available Travel Hunter DS variables where applicable: `color/action/primary`, `color/action/primary-soft`, `primary/100`, and `radius/xl`.
- [x] Figma validation passed: page exists, component measures `72x72`, documentation frame has 3 children, and auth preview has 5 children.
- [x] Updated `.agent/figma-design-system-state.json` with the Brand Mark page/component IDs and validated it with `python -m json.tool`.
- [x] Updated repo-local Figma mapping files with `BrandMark -> frontend/src/components/patterns.tsx#BrandMark`.
- [x] Attempted official Figma Code Connect mapping for `BrandMark`; blocked by Figma plan/seat requirement: Developer seat in Organization or Enterprise plan is required.

Remaining risks:
- Official Figma Code Connect is not active for this account/file. Repo-local mapping remains the source of truth until the Figma plan/seat requirement is resolved.

## 2026-05-24 Seed/preview fallback 제거 및 security LOW 해소 패치

- [x] 프런트엔드 App 테스트에서 `appDataApi.getPreviewTrip()` / `getPreviewUser()` 직접 호출 패턴을 제거하고, 테스트 내부 `getPreviewTrip/getPreviewUser` 헬퍼를 통해 일관된 fixture 데이터를 사용.
- [x] `/profile-setup` 테스트를 프로필 옵션 API 비동기 로딩을 기다리는 형태로 변경.
- [x] 보안 LOW 항목 1 (`backend/app/services/phone_verification_provider.py`) 처리:
  - `DevPhoneVerificationProvider` 메시지 저장을 최대 개수 제한 deque 및 락으로 변경.
  - 회귀 커버 테스트 추가: `backend/tests/test_phone_verification_provider.py`.
- [x] 보안 LOW 항목 2 (`backend/app/services/external_collection_scheduler.py`) 처리:
  - 글로벌 스케줄러 참조를 getter/setter + 락으로 관리.
  - 라우트 테스트가 직접 전역 변수를 건드리지 않도록 업데이트: `backend/tests/test_ops_routes.py`.
- [x] `docs/security-review/2026-05-22-review-findings.md` 텍스트 정리 및 LOW 체크리스트 항목을 `[x]`로 반영.

Remaining risks:
- `App.test.tsx` 변경은 테스트 fixture 추가와 비동기 대기 타이밍 보완이므로 본문 실행 스모크는 별도 실행 필요.
## 2026-05-24 Applied Policy Links Page

- [x] Added `GET /api/me/applied-policy-links` as a non-breaking endpoint for policy-to-linked-trip grouping.
- [x] Added `/applied-policies` frontend page through `AppDataApi` and linked the MyPage 신청 정책 stat card to it.
- [x] Validation passed: `docker compose -f compose.yaml up -d --build` rebuilt backend/frontend, passed frontend `tsc --noEmit`, passed Vite production build, and restarted healthy containers.

## 2026-05-25 CSS cleanup verification

- Scope: consolidated final CSS rules for app/page surfaces, header, policy titlebar, trips cards, and mypage profile card in `frontend/src/styles/app.css`.
- Build: `docker compose -f compose.yaml up -d --build` completed before browser verification; frontend typecheck and Vite build completed during image build.
- Browser verification target: `http://127.0.0.1:4173` after logging in with the seeded test user.
- `/home`: `#root` and `main > section` computed `background-color: rgb(255, 253, 250)`; service header computed `background-color: rgb(255, 255, 255)` and `border-bottom-color: rgb(240, 241, 245)`.
- `/policies`: `.prototype-policy-titlebar` and `.prototype-category-tabs` computed `background-color: rgb(255, 255, 255)` and `align-items: center`; favorites button remained `rgb(255, 94, 91)`.
- `/trips`: `.prototype-screen-head` computed `background-color: rgb(255, 253, 250)`; first `.itinerary-card` computed white background, card shadow `rgba(19, 30, 52, 0.06) 0px 12px 32px 0px`, and grid layout; `.card-arrow` selector was absent.
- `/mypage`: `.prototype-profile-hero-card` computed white background, `border-top-color: rgb(236, 236, 241)`, and `box-shadow: none`; stat/settings cards use the same border color.
- Remaining risk: `app.css` still contains older page-specific rules above the final layer. The final layer now owns the recent cleanup targets, but a later CSS architecture pass should split tokens/base/page overrides to reduce future conflicts.

## 2026-05-25 CSS risk cleanup pass

- Scope: reduced remaining CSS structure risk in `frontend/src/styles/app.css` by adding explicit surface tokens, moving the root app shell away from the old gray fallback, tokenizing shell/nav tint and trip-card border values, and splitting the final cleanup layer comments into shared surface rules and page-specific alignment rules.
- Files changed: `frontend/src/styles/app.css`, `CHECKLIST.md`.
- Build/verification: `docker compose -f compose.yaml up -d --build` passed. The frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-NmBWntn8.css` and `dist/assets/index-Ce7EG7HZ.js`.
- Browser verification target: `http://127.0.0.1:4173` after seeded-user login.
- `/home`: `#root` and `main > section` computed `background-color: rgb(255, 253, 250)`; service header computed `background-color: rgb(255, 255, 255)`, `border-bottom-color: rgb(240, 241, 245)`, and the expected subtle shadow.
- `/policies`: `.prototype-policy-titlebar` and nested `.prototype-category-tabs` computed white background with centered alignment; favorites button remained the red primary pill.
- `/trips`: `.prototype-screen-head` computed `rgb(255, 253, 250)`; `.itinerary-card` computed white background, `border-top-color: rgb(240, 240, 245)`, trip card shadow, grid layout, and `.card-arrow` count was `0`.
- `/mypage`: `.prototype-profile-hero-card` computed white background, `border-top-color: rgb(236, 236, 241)`, and `box-shadow: none`; stat/settings cards shared the same border color.
- Remaining risk: the app still uses one large `app.css` file with older page-specific rules above the final layer. The immediate surface/header/card conflict is stabilized, but a later larger cleanup should split CSS into base tokens, shared components, and page-specific files or clearly separated sections.

## 2026-05-25 CSS architecture cleanup start

- Scope: started the larger CSS cleanup in `frontend/src/styles/app.css` without changing React route or API code.
- Changed the top of `app.css` to document the intended CSS architecture: tokens, app shells, primitives, legacy page rules, shared final surfaces, and page-specific final rules.
- Added/used shared tokens for header shadow and remaining trip-card border cleanup so future page overrides do not introduce new hardcoded surface/border values.
- Added section boundaries for public/auth shells, authenticated app shell, shared primitives, auth screen rules, home screen rules, responsive service navigation, legacy service page rules, shared final surfaces, and final page-specific cleanup rules.
- Validation status: not run in this step. Next required validation is `docker compose -f compose.yaml up -d --build` plus browser computed-style checks for `/home`, `/policies`, `/trips`, and `/mypage` after user approval.
- Remaining risk: this pass organizes and tokenizes the large single CSS file, but it does not yet physically split CSS into separate files or remove every older duplicate selector block. That should happen after the current visual baseline is revalidated.

## 2026-05-25 CSS architecture cleanup validation

- Scope: validated the larger CSS architecture cleanup pass after Docker rebuild.
- Build: `docker compose -f compose.yaml up -d --build` passed. Frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-DW9U3h0v.css` and `dist/assets/index-DDHmGu4M.js`.
- Browser target: `http://127.0.0.1:4173` in the in-app browser after seeded-user login.
- Browser CSS bundle observed: `http://127.0.0.1:4173/assets/index-DW9U3h0v.css`.
- `/home`: `#root` and `main > section` computed `background-color: rgb(255, 253, 250)`; header computed `background-color: rgb(255, 255, 255)`, `border-bottom-color: rgb(240, 241, 245)`, and subtle header shadow.
- `/policies`: `.prototype-policy-titlebar` and nested `.prototype-category-tabs` computed `background-color: rgb(255, 255, 255)` and centered alignment; `.prototype-head-pill` remained the red primary button.
- `/trips`: `.prototype-screen-head` computed `background-color: rgb(255, 253, 250)`; `.itinerary-card` computed white background, `border-top-color: rgb(240, 240, 245)`, trip-card shadow, and grid layout; `.card-arrow` count was `0`.
- `/mypage`: `.prototype-profile-hero-card` computed white background, `border-top-color: rgb(236, 236, 241)`, and `box-shadow: none`; stat/settings cards shared the same border color.
- Remaining risk: CSS is now sectioned and tokenized around the recent conflicts, but older duplicate screen rules still exist in the legacy section. The next cleanup should remove or merge duplicate `/trips` and `/policies` blocks one screen at a time with browser checks after each removal.

## 2026-05-25 CSS duplicate-block merge pass

- Scope: continued the larger CSS cleanup in `frontend/src/styles/app.css` by merging duplicate `/trips` and `/policies` rules back into the legacy page sections and reducing the final override layer.
- `/trips`: removed the older single-column trip-card duplicate block, replaced the remaining trip-list card block with the current left-thumbnail grid card rules, scoped trip emoji/card body/title/delete/meta/tag rules there, and removed the duplicated final trip-card override block.
- `/trips`: removed trip-list and mypage from the old warm-gradient schedule/mypage background group, leaving that gradient rule for trip create/detail screens only; the trip list screen head now owns its warm paper background directly.
- `/policies`: promoted the titlebar/category-tabs/favorites-button alignment into the policy list clone section, including the hidden title, grid titlebar, white category tabs, and centered favorites pill; removed the duplicated final policy titlebar override block.
- Final layer: kept the shared app/header surface layer and the mypage profile-card final rule, but reduced page-specific final overrides for `/trips` and `/policies` because those values now live with their page sections.
- Validation status: not run in this step. Recommended next check is `docker compose -f compose.yaml up -d --build` followed by browser computed-style checks for `/home`, `/policies`, `/trips`, and `/mypage`.
- Remaining risk: this pass was structural CSS cleanup. Until rebuild/browser verification runs, treat visual parity as pending.

## 2026-05-25 CSS duplicate-block merge validation

- Scope: validated the `/trips` and `/policies` duplicate CSS block merge after Docker rebuild.
- First rebuild note: `docker compose -f compose.yaml up -d --build` completed but Vite/esbuild reported one CSS minify warning from a literal `` `r`n `` sequence left by the previous PowerShell replacement.
- Fix applied: replaced the single literal `` `r`n `` sequence in `frontend/src/styles/app.css` with an actual CRLF newline.
- Final build: `docker compose -f compose.yaml up -d --build` passed without CSS warnings. Frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-BzCyCnV0.css` and `dist/assets/index-C94_ehf3.js`.
- Browser target: `http://127.0.0.1:4173` in the in-app browser after seeded-user login.
- Browser CSS bundle observed: `http://127.0.0.1:4173/assets/index-BzCyCnV0.css`.
- `/home`: `#root` and `main > section` computed `background-color: rgb(255, 253, 250)`; service header computed white background, `border-bottom-color: rgb(240, 241, 245)`, and the expected subtle header shadow.
- `/policies`: `.prototype-policy-titlebar` computed `display: grid`, white background, `border-bottom-color: rgb(240, 241, 245)`, and centered alignment; `.prototype-policy-titlebar h1` count was `0`; nested category tabs were static, white, 58px high; favorites pill remained red and centered.
- `/trips`: `.prototype-screen-head` computed `rgb(255, 253, 250)`; `.itinerary-card` computed grid layout, `grid-template-columns: 72px 672px`, white background, `border-top-color: rgb(240, 240, 245)`, and trip-card shadow; `.map-thumb` computed 72px square grid with centered content; `.trip-visual-emoji` computed 32px and translateY(-2px); `.card-arrow` count was `0`.
- `/mypage`: profile/stat/settings cards retained white background and `border-top-color: rgb(236, 236, 241)`; profile hero retained `box-shadow: none`.
- Remaining risk: `/trips` and `/policies` active final overrides were merged into their page sections successfully. The next safe cleanup target is the remaining mypage profile-card final rule and any older unused selector groups outside the verified screens, one screen at a time.

## 2026-05-25 CSS mypage final-rule merge

- Scope: moved the remaining `/mypage` profile hero card final override back into the mypage page section in `frontend/src/styles/app.css`.
- Change: the first `.prototype-profile-hero-card` rule now owns `border: 1px solid var(--border-card)`, `background: var(--surface-card)`, and `box-shadow: var(--shadow-none)` directly.
- Change: removed the duplicated `.prototype-profile-hero-card` block from the final override layer, further reducing the final section to shared app/header surface rules.
- Cleanup boundary: did not blindly remove selector groups outside the recently verified `/home`, `/policies`, `/trips`, and `/mypage` screens. Those should be removed screen-by-screen after opening their route and confirming the selector is not used.
- Next safe removal candidates: old screen-specific groups for policy detail, trip create/detail, applied policies, auth/profile setup, and any preview/prototype-only selectors that do not appear in the current rendered DOM.
- Validation status: not run after this patch. Recommended next check is `docker compose -f compose.yaml up -d --build` plus browser computed-style checks for `/home`, `/policies`, `/trips`, and `/mypage`.

## 2026-05-25 CSS mypage merge and policy-detail cleanup validation

- Scope: validated the `/mypage` profile hero merge and then removed one old duplicate `/policy detail` CSS block from `frontend/src/styles/app.css`.
- First build after `/mypage` merge: `docker compose -f compose.yaml up -d --build` passed. Frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-Dkw8mLWG.css` and `dist/assets/index-CUbo347J.js`.
- Browser verification after `/mypage` merge used `http://127.0.0.1:4173/assets/index-Dkw8mLWG.css` after seeded-user login.
- `/home`: root/header/screen surface values remained warm paper and white header.
- `/policies`: titlebar remained grid, white, centered; category tabs remained static/white/58px; favorites pill remained red.
- `/trips`: trip list head remained warm paper; itinerary cards remained left-thumbnail grid with white card, trip-card border, and no `.card-arrow` elements.
- `/mypage`: `.prototype-profile-hero-card` computed white background, `border-top-color: rgb(236, 236, 241)`, and `box-shadow: none`, proving the final override merge did not break the profile card.
- Cleanup applied: removed the older short `.prototype-policy-detail-screen` detail block that preceded the current `Prototype policy detail clone pass`. The current policy detail clone pass remains the source of truth for that screen.
- Second build after policy-detail cleanup: `docker compose -f compose.yaml up -d --build` passed. Frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-DwgzubkL.css` and `dist/assets/index-ChOpPFZL.js`.
- Browser verification after policy-detail cleanup used `http://127.0.0.1:4173/assets/index-DwgzubkL.css`.
- `/policies/dgtour-%EB%B0%80%EC%96%91-1`: `.prototype-policy-detail-screen` rendered with warm paper background; `.hero` remained 240px high with the expected travel-mood gradient and no shadow; `.title-block`, `.section-block`, and `.sticky-cta` remained present with expected computed styles.
- Remaining risk: policy detail old duplicate block removal is verified. The next screen-by-screen cleanup target should be `/trips/1` or `/trips/new`, removing only duplicated trip detail/create selectors after capturing their current computed baseline.

## 2026-05-25 CSS trip-detail cleanup validation

- Scope: started the screen-by-screen cleanup for trip detail CSS in `frontend/src/styles/app.css`.
- Baseline note: requested `/trips/1` currently renders the trip-detail error state (`정보를 불러오지 못했어요`) because the current DB list links to actual trip ids such as `/trips/36`. The active trip-detail visual baseline was captured from `/trips/36`.
- Cleanup applied: split old mixed create/detail selectors so `.prototype-trip-create-screen` keeps its create-screen rules, removed obsolete early trip-detail duplicate selectors, and restored the current trip-detail rules inside the active trip detail section after verification showed the first removal was too broad.
- Rebuild after cleanup: `docker compose -f compose.yaml up -d --build` passed. Frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-DeTrhKW9.css` and `dist/assets/index-CDhzKVGg.js`.
- Verification issue found: first browser check showed `/trips/36` hero/day-tabs/place-detail had lost the current baseline because the removal touched active selectors too. This was fixed before completion.
- Rebuild after restore: `docker compose -f compose.yaml up -d --build` passed. Frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-DAL_Uok_.css` and `dist/assets/index-BrdEortk.js`.
- Final browser verification used `http://127.0.0.1:4173/assets/index-DAL_Uok_.css`.
- `/trips`: itinerary cards remained grid with `grid-template-columns: 72px 672px`, white background, trip-card border, and shadow; `.card-arrow` count remained `0`.
- `/trips/1`: remained the expected error state for the missing trip id, with `.prototype-trip-detail-screen` warm paper background and no detail hero.
- `/trips/36`: detail page rendered successfully; `.prototype-trip-detail-hero` returned to 200px height/min-height, travel gradient background, no shadow, and white title; `.day-tabs` returned to flex with `14px 16px 12px` padding; `.place-detail` returned to grid with 10px radius and the subtle card shadow; linked policy banner stayed green and grid-based.
- `/mypage`: profile hero card retained white background, `border-top-color: rgb(236, 236, 241)`, and `box-shadow: none`.
- Remaining risk: `/trips/new` has not been cleaned in this pass. Next safe pass should capture `/trips/new` baseline first, then remove only duplicated create-screen selectors.

## 2026-05-25 CSS trip-create cleanup validation

- Scope: cleaned the `/trips/new` trip-create CSS after capturing the current rendered baseline.
- Baseline: `/trips/new` currently renders `.prototype-create-top`, `.prototype-create-progress`, `.prototype-create-content`, `.prototype-create-step-panel`, `.prototype-region-grid`, and `.prototype-create-sticky-actions`. Old create selectors such as `.prototype-trip-create-screen .top-bar`, `.prototype-create-steps`, `.prototype-trip-create-screen .card`, `.prototype-trip-create-screen .page-head`, and `.prototype-trip-create-screen .choice-grid` were absent from the DOM.
- Cleanup applied: removed the old create-screen selector groups that do not appear in `/trips/new`.
- First rebuild: `docker compose -f compose.yaml up -d --build` passed and produced `dist/assets/index-C-m-JvkQ.css`, but browser verification found a regression on `/trips`: itinerary cards had fallen back to an older 96px thumbnail layout.
- Fix applied: restored the current trip-list card geometry in a focused `Trip list current card rules` block near the shared final surface layer because older list-card groups still define legacy card geometry.
- Final rebuild: `docker compose -f compose.yaml up -d --build` passed. Frontend build ran `npm run typecheck && vite build` and produced `dist/assets/index-DMyK0aYw.css` and `dist/assets/index-Ck0Ur1DX.js`.
- Final browser verification used `http://127.0.0.1:4173/assets/index-DMyK0aYw.css`.
- `/trips/new`: create screen kept warm paper background, `.prototype-create-top` grid header, 3px progress bar, flex content, region grid, active region button styling, and sticky action button; old create selector counts were all `0`.
- `/trips`: itinerary cards returned to grid layout with `72px` thumbnail column, white background, `rgb(240, 240, 245)` border, current trip-card shadow, 72px centered map thumb, and `.card-arrow` count `0`.
- `/mypage`: profile hero card retained white background, `border-top-color: rgb(236, 236, 241)`, and `box-shadow: none`.
- Remaining risk: trip-list current card rules are intentionally kept near the final layer as a regression guard. A future deeper cleanup should remove or rewrite the older generic list-card group that still tries to impose legacy trip-card geometry, then move the trip-list guard back into the main trip-list section.

## 2026-05-25 /trips legacy list-card guard cleanup

- Scope: narrowed the old generic card group so `.prototype-trip-list-screen .itinerary-card` is no longer styled by the legacy policy/mypage list-card rule.
- Scope: moved the current `/trips` card rules out of the final override guard area and into the trip list screen section.
- Validation: `docker compose -f compose.yaml build` passed; frontend build emitted `dist/assets/index-B_Mx3ric.css` and `dist/assets/index-DQHDbNzK.js`.
- Browser validation: `/trips` computed first card as `display: grid`, `grid-template-columns: 72px 596px`, `border-radius: 26px`, `border-color: rgb(240, 240, 245)`, thumbnail `72px` by `72px`, and `.card-arrow` count `0`.
- Browser validation: `/trips/new` kept `screenBackground: rgb(255, 253, 250)`, `contentDisplay: flex`, `regionGridDisplay: grid`, and removed legacy create selectors remained at count `0`.
- Browser validation: `/mypage` profile hero stayed `background: rgb(255, 255, 255)`, `border-color: rgb(236, 236, 241)`, `box-shadow: none`.
- Remaining risk: additional old generic selector groups may still exist for policy/mypage legacy surfaces, but `/trips` list no longer depends on a final-layer repair guard for the 72px thumbnail layout.

## 2026-05-25 /policies policy-list-card CSS selector fix

- Scope: replaced the broken policy list styling path with current DOM selectors: `.policy-list-card`, `.policy-list-card-link`, `.policy-list-icon`, `.policy-list-copy`, `.policy-list-taxonomy`, `.policy-list-badges`, `.policy-list-meta`, and `.policy-list-heart`.
- Scope: removed obsolete `/policies` `.list-card`, `.thumb-row`, and `.square-thumb` styling from the active policy list section; mypage `.card` styling remains scoped separately.
- Validation: `docker compose -f compose.yaml build` passed; frontend build emitted `dist/assets/index-BpsIxYZK.css` and `dist/assets/index-Ii3jeSNZ.js`.
- Deployment validation: `docker compose -f compose.yaml up -d` recreated backend and frontend containers successfully.
- Browser validation: `/policies` loaded `http://127.0.0.1:4173/assets/index-BpsIxYZK.css`.
- Browser validation: `/policies` found 71 `.policy-list-card`, 71 `.policy-list-icon`, 71 `.policy-list-heart`, and 0 legacy `.list-card` / `.square-thumb` nodes in the policy list.
- Browser validation: first policy card computed `position: relative`, `border-radius: 18px`, `border-color: rgb(240, 240, 245)`, `box-shadow: rgba(23, 23, 40, 0.06) 0px 8px 22px 0px`.
- Browser validation: first policy link computed `display: grid`, `grid-template-columns: 64px 542px 44px`, `min-height: 118px`, `padding: 16px`.
- Browser validation: first policy icon computed `display: grid`, `width: 64px`, `height: 64px`, `place-items: center`, `border-radius: 18px`, `font-size: 28px`.
- Remaining risk: old `.list-card` / `.square-thumb` selectors still exist elsewhere in the stylesheet for other legacy surfaces, but they no longer target actual `/policies` list DOM.

## 2026-05-25 legacy list-card/square-thumb CSS removal

- Scope: removed unused global legacy selectors `.list-card`, `.list-card h3`, `.square-thumb`, and `.thumb-row` from `frontend/src/styles/app.css`.
- Scope: removed `.thumb-row` from the shared flex helper selector group and `.square-thumb` from the visual tile helper group.
- Evidence before edit: source search found `.list-card`, `.square-thumb`, and `.thumb-row` only in `frontend/src/styles/app.css`; no TSX/JSX usage remained in `frontend/src`.
- Validation: not run in this step because the request was cleanup start only and no rebuild/browser validation was explicitly requested.
- Remaining risk: global legacy itinerary selectors such as `.itinerary-card`, `.map-thumb`, `.itinerary-body`, and `.card-arrow` still exist and should be audited separately because active trip screens have more specific scoped replacements.

## 2026-05-25 global itinerary legacy selector cleanup

- Pre-cleanup validation: `docker compose -f compose.yaml build` and `docker compose -f compose.yaml up -d` passed after the previous `.list-card` / `.square-thumb` removal; frontend served `index-CfFmL-8g.css`.
- Pre-cleanup browser validation: `/policies` kept 71 `.policy-list-card` nodes, 0 legacy `.list-card` / `.square-thumb` nodes, card radius `18px`, link display `grid`, and icon size `64px x 64px`.
- Pre-cleanup browser validation: `/trips` kept 31 `.itinerary-card` nodes, 0 `.card-arrow` nodes, grid `72px 596px`, card radius `26px`, and thumbnail `72px x 72px`.
- Scope: removed global legacy itinerary selectors from `frontend/src/styles/app.css`: `.itinerary-card`, `.map-thumb`, `.itinerary-body`, `.itinerary-head`, `.itinerary-title-link`, `.itinerary-actions`, `.card-arrow`, global `.trip-delete-btn`, and related global `.itinerary-card` media references.
- Scope: kept current `/trips` styling under `.prototype-trip-list-screen ...` selectors and moved `.trip-delete-btn:disabled` state into that scoped area.
- Validation: `docker compose -f compose.yaml build` and `docker compose -f compose.yaml up -d` passed; frontend build emitted `dist/assets/index-B-uPNhuE.css` and `dist/assets/index-rt1Oh--Q.js`.
- Browser validation: `/trips` loaded `index-B-uPNhuE.css`; global selector counts were `.itinerary-card: 0`, `.map-thumb: 0`, `.itinerary-body: 0`, `.card-arrow: 0`; scoped selector counts were `1` each for `.prototype-trip-list-screen .itinerary-card`, `.map-thumb`, `.itinerary-body`, `.card-arrow`.
- Browser validation: `/trips` first card computed `display: grid`, `grid-template-columns: 72px 596px`, `margin-bottom: 0px`, `border-radius: 26px`, `border-color: rgb(240, 240, 245)`, thumbnail `72px x 72px`, body `display: grid`, head `display: flex`, delete button `min-width: 34px`, `min-height: 28px`, `border-radius: 999px`.
- Browser validation: `/policies` still had 71 `.policy-list-card` nodes, card radius `18px`, link display `grid`, and 0 legacy `.list-card` nodes.
- Browser validation: `/mypage` profile hero stayed `background: rgb(255, 255, 255)`, `border-color: rgb(236, 236, 241)`, `box-shadow: none`.
- Remaining risk: other broad global component selectors in the legacy service section may still overlap with scoped screen rules; next safe target is auditing `.result-card`, `.result-photo`, `.policy-mini`, and generic `.hero`/`.sticky-cta` only where active screens have scoped replacements.

## 2026-05-25 active-screen CSS risk cleanup

- Scope: implemented the active-screen CSS risk cleanup plan without backend/API/route/type changes.
- Scope: removed CSS-only legacy home rail selectors with no active TSX usage: `.policy-mini`, `.policy-mini-top`, `.place-card`, and `.visual-tile`.
- Scope: removed or scoped legacy/global detail selectors that were already covered by active screen rules: `.hero`, `.hero-label`, `.detail-body`, `.section-block h3`, `.sticky-cta`, `.trip-summary`, `.benefit-banner`, `.map-large`, `.day-tabs`, `.timeline`, `.benefit-banner-icon`, `.benefit-banner-arrow`, and `.timeline-marker`.
- Scope: kept active AI result selectors `.result-card` and `.result-photo` because `/trips/:id` AI recommendation result cards still use them and no scoped replacement exists.
- Scope: kept broad utility selectors such as `.btn`, `.tag`, `.meta`, `.row`, `.stack`, and `.content` unchanged.
- Validation: `docker compose -f compose.yaml build` passed and emitted `dist/assets/index-D-Hm2Htu.css` and `dist/assets/index-BLzfoDMt.js`; `docker compose -f compose.yaml up -d` recreated backend/frontend containers successfully.
- Browser validation: CSS selector counts on the served app were `0` for global `.hero`, `.detail-body`, `.sticky-cta`, `.trip-summary`, `.benefit-banner`, `.map-large`, `.day-tabs`, `.timeline`, `.policy-mini`, `.place-card`, `.visual-tile`, `.benefit-banner-icon`, and `.timeline-marker`; scoped counts remained present for policy and trip detail selectors.
- Browser validation: `/home` loaded `index-D-Hm2Htu.css`, hero radius stayed `16px`, policy card display stayed `grid`, and AI card display stayed `block`.
- Browser validation: `/policies` kept 71 `.policy-list-card` nodes, link display `grid`, grid `64px 542px 44px`, icon `64px x 64px`, heart display `grid`, and legacy `.list-card` count `0`.
- Browser validation: `/policies/:slug` kept hero `240px`, detail body display `block`, body padding `20px 16px 112px`, sticky CTA position `sticky`, bottom `72px`, and section divider `rgb(236, 236, 241)`.
- Browser validation: `/trips` kept 31 cards, `.card-arrow` count `0`, card grid `72px 596px`, and thumbnail `72px x 72px`.
- Browser validation: `/trips/new` kept warm paper background `rgb(255, 253, 250)`, content display `flex`, and panel radius `0px`.
- Browser validation: `/trips/36` kept hero `200px`, summary padding `14px 16px`, day tabs display `flex`, timeline display `block`, timeline margin-bottom `16px`, place grid `34px 531.5px 84.5px`, and timeline marker display `flex`.
- Browser validation: `/mypage` profile hero stayed `background: rgb(255, 255, 255)`, `border-color: rgb(236, 236, 241)`, `box-shadow: none`.
- Browser validation: `/applied-policies` content display stayed `grid`, with 1 applied policy card and card display `grid`.
- Browser validation: `/login`, `/signup`, and `/forgot-password` at 360px viewport had form width `312px` and no horizontal overflow.
- Remaining risk: `.result-card` / `.result-photo` remain global by design for active AI recommendation results. Other editor-adjacent globals such as `.marker`, `.time`, and `.place-detail` are outside this cleanup pass and should only be touched if scoped replacements are added and verified.

## 2026-05-25 /policies titlebar and filter row alignment

- Scope: aligned `/policies` category tabs and favorite button by adding scoped toolbar rules under `.prototype-policy-list-screen .prototype-policy-titlebar`.
- Scope: reset `/policies` category tabs from sticky/padded common behavior to static toolbar behavior only within the policy list screen.
- Scope: styled `.prototype-policy-filter-shell`, `.prototype-policy-filter-row`, and `.prototype-filter-pill` as a second aligned pill row with horizontal scrolling and consistent button sizing.
- Validation: `docker compose -f compose.yaml build` passed; frontend build emitted `dist/assets/index-BZ506XHH.css` and `dist/assets/index-Tl3fAG0s.js`.
- Remaining risk: browser visual/computed validation was not run in this step because the explicit request was implementation plus Docker rebuild only.

## 2026-05-26 /policies titlebar and filter row runtime verification

- Deployment validation: `docker compose -f compose.yaml up -d` passed; backend/frontend containers were recreated and started successfully.
- Browser validation: `/policies` loaded `http://127.0.0.1:4173/assets/index-BZ506XHH.css`.
- Browser validation: policy toolbar found 7 category tabs, 3 filter pills, and 71 policy cards.
- Browser validation: scoped CSS rules were present for `.prototype-policy-list-screen .prototype-policy-titlebar`, `.prototype-policy-filter-row`, and `.prototype-filter-pill`.
- Browser validation: `.prototype-policy-titlebar` computed `display: grid`, `grid-template-columns: 674.469px 87.5312px`, `align-items: center`, `padding-left/right: 24px`, `padding-bottom: 10px`, `background: rgb(255, 255, 255)`.
- Browser validation: `.prototype-category-tabs` inside `/policies` computed `position: static`, `display: flex`, `gap: 8px`, `padding: 0`, `overflow-x: auto`, `background: transparent`.
- Browser validation: `.prototype-head-pill` was vertically aligned with the active category tab center and kept `min-height: 34px`, `display: flex`, `white-space: nowrap`.
- Browser validation: `.prototype-policy-filter-shell` computed `display: grid`, `padding-left/right: 24px`, `padding-bottom: 12px`, `background: rgb(255, 255, 255)`.
- Browser validation: `.prototype-policy-filter-row` computed `display: flex`, `align-items: center`, `gap: 8px`, `overflow-x: auto`.
- Browser validation: `.prototype-filter-pill` computed `display: flex`, `min-height: 32px`, `border-radius: 999px`, `font-size: 13px`, `font-weight: 800`.
- Alignment evidence: category tabs and filter row shared the same left edge (`tabsAndFilterRowLeftDelta: 0`); titlebar and filter shell shared the same left edge; favorite button was aligned with the active tab center.
- Visual validation: screenshot confirmed category tabs and favorite button are one aligned toolbar row, with the region/period/amount filters as a second aligned pill row above the policy cards.
- Remaining risk: no functional behavior was changed; only CSS alignment was verified. If a different desktop width is targeted, repeat visual verification at that viewport.

## 2026-05-26 /policies card titlebar visual selection

- Scope: applied the selected option 2 card-style control bar to `/policies` by updating `.prototype-policy-list-screen .prototype-policy-titlebar`.
- Scope: fixed the category tab top clipping risk by adding top spacing inside a bordered white titlebar card.
- Scope: changed `.prototype-policy-list-screen .prototype-head-pill` to a soft red favorite CTA that matches the app's red action color without using the heavier solid button style.
- Validation: `docker compose -f compose.yaml build` passed; frontend build emitted `dist/assets/index-BrUBpPJL.css` and `dist/assets/index-BeWmUQoF.js`.
- Remaining risk: browser visual/computed validation was not run in this step because the requested action was selection implementation plus Docker rebuild.

## 2026-05-26 /policies narrow titlebar and filter background fix

- Issue confirmed: browser computed styles showed `.prototype-policy-filter-shell` still used `rgb(255, 255, 255)` while the active policy screen background used warm paper `rgb(255, 253, 250)`.
- Issue confirmed: the card-style `.prototype-policy-titlebar` kept category tabs and the favorite CTA in one grid row at all widths, which can squeeze the category menu on narrow screens.
- Scope: changed `.prototype-policy-filter-shell` background to transparent so the region/period/amount filter row sits on the same warm paper background as the page.
- Scope: added a narrow-screen rule under `640px` so the category tabs and favorite CTA stack inside the card titlebar instead of competing for the same row width.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-CsdDqIub.css` and `dist/assets/index-CBirAECW.js`.
- Browser validation: `/policies` loaded `http://127.0.0.1:4173/assets/index-CsdDqIub.css`, rendered 7 category tabs, 3 filter pills, and 71 policy cards with no console warnings/errors reported.
- Browser validation: `.prototype-policy-filter-shell` computed `background: rgba(0, 0, 0, 0)` while `.prototype-policy-list-screen` stayed warm paper `rgb(255, 253, 250)`.
- Browser validation: the served stylesheet contains both the transparent filter-shell rule and the `@media (max-width: 640px)` narrow titlebar rule.
- Remaining risk: current in-app browser viewport was wider than the reported narrow screenshot, so the media rule presence was verified from the served CSS rather than a resized mobile viewport screenshot.

## 2026-05-26 /policies toolbar DOM structure cleanup

- Scope: implemented the selected toolbar structure by introducing `.prototype-policy-toolbar` and moving the saved-only button out of `.prototype-policy-titlebar`.
- Scope: kept `.prototype-policy-titlebar` responsible only for category tabs, and moved filter dropdown panels plus the reset button into `.prototype-policy-filter-panels`.
- Scope: replaced the previous narrow-screen stacking override with grid-area layout: desktop uses `title | favorite`, mobile uses `favorite | filters` under the category titlebar.
- Scope: removed the red shadow from `.prototype-head-pill` while keeping the soft red border/background treatment.
- Scope: hid the titlebar scrollbar because the category card became the horizontal scroll container after the DOM cleanup.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-C8Zp2Lzb.css` and `dist/assets/index-gzVOndFO.js`.
- Browser validation: `/policies` loaded `http://127.0.0.1:4173/assets/index-C8Zp2Lzb.css`, rendered 1 toolbar, 7 category tabs, 3 filter pills, and 71 policy cards with no console warnings/errors reported.
- Browser validation: `.prototype-policy-titlebar > .prototype-head-pill` count was `0`, `.prototype-policy-toolbar > .prototype-head-pill` count was `1`, and the favorite CTA computed `box-shadow: none`.
- Browser validation: desktop toolbar computed grid areas `"title favorite" "filters filters" "panels panels"`, favorite/titlebar center delta was `0px`, and the filter row was below the titlebar row.
- Browser validation: saved-only toggle set `?saved=1`, opened `.prototype-policy-filter-panels`, region filter opened `.prototype-region-picker`, and reset returned the URL to `/policies`.
- Browser validation: a 390px iframe visual check showed the mobile layout with `♥ 즐겨찾기`, `🌎 지역`, `🗓 기간`, and `💰 금액` on the same row below the category titlebar, without the exposed titlebar scrollbar.
- Remaining risk: mobile was verified visually through a 390px iframe wrapper because the in-app browser tab API does not expose direct viewport resizing.

## 2026-05-26 /policies policy list taxonomy removal

- Scope: removed `.policy-list-taxonomy` from `PolicyListCard` because the category label duplicated the policy icon/category context and made card hierarchy heavier.
- Scope: removed the matching `.prototype-policy-list-screen .policy-list-taxonomy` CSS block instead of hiding it with an override.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-D8ZqwiER.css` and `dist/assets/index-8FJ9lbde.js`.
- Browser validation: `/policies` loaded `http://127.0.0.1:4173/assets/index-D8ZqwiER.css`, rendered 71 policy cards, and `.policy-list-taxonomy` count was `0`.
- Browser validation: `/policies` card copy retained 71 badge rows, 71 titles, and 71 meta rows; the first card kept badge -> title -> meta vertical order and no horizontal overflow.
- Browser validation: `/policies/:slug` rendered policy detail hero/title/icon with `.policy-list-taxonomy` count `0`.
- Browser validation: `/mypage` rendered profile hero, favorite section, and favorite policy thumb with `.policy-list-taxonomy` count `0`.
- Browser validation: `/trips/36` rendered trip detail hero, day tabs, timeline, and linked policy content with `.policy-list-taxonomy` count `0`.
- Remaining risk: no API/data behavior changed; this cleanup only removes the duplicated category line from list card presentation.

## 2026-05-26 /home AI chat bubble card implementation

- Scope: replaced the `/home` AI recommendation card visual from the previous map route graphic to the selected AI concierge chat bubble direction.
- Scope: removed the old city block, route line, and map pin DOM from `HomePage.tsx` and replaced it with one robot avatar, two chat bubbles, and two emoji chips.
- Scope: replaced the matching map-specific CSS with scoped chat-card presentation rules under `.prototype-home-ai-*`.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-CoaS7uu8.css` and `dist/assets/index-DZ5R3BRJ.js`.
- Browser validation: `/home` rendered 1 `.prototype-home-ai-card`, 1 `.prototype-home-ai-chat-avatar`, 2 `.prototype-home-ai-chat-bubble` nodes, and 2 `.prototype-home-ai-emoji-chip` nodes.
- Browser validation: legacy AI map visual counts were all `0` for `.prototype-home-ai-city-block`, `.prototype-home-ai-route-line`, and `.prototype-home-ai-pin`.
- Browser validation: the AI card computed `border-radius: 18px`, `border-color: rgb(236, 236, 241)`, visual height `132px`, and no horizontal overflow on the current in-app browser viewport.
- Remaining risk: direct mobile viewport resizing is not exposed by the in-app browser API, and a local Playwright viewport probe timed out; if a small-screen visual issue is reported, re-check the card at 390px with an external browser/device tool.

## 2026-05-26 /home AI recommendation card componentization

- Scope: created `frontend/src/components/AiRecommendationCard.tsx` so `/home` passes `to`, `title`, `saving`, `detail`, and a `visual` config object instead of owning the full AI card markup.
- Scope: replaced the `/home` inline AI card JSX with `<AiRecommendationCard />` and moved avatar, headline, subline, and chip data into `aiCardVisual`.
- Scope: replaced absolute-positioned chip classes with grid/flex layout rules: `.prototype-home-ai-visual` now computes as grid, chat copy is a grid stack, and chips render in `.prototype-home-ai-chat-chips`.
- Scope: removed the legacy position-specific classes `.prototype-home-ai-emoji-chip`, `.chip-food`, `.chip-hotel`, `.prototype-home-ai-chat-bubble.main`, and `.prototype-home-ai-chat-bubble.sub` from the active source.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-C-SLn6HN.css` and `dist/assets/index-B0gIhU2O.js`.
- Browser validation: `/home` loaded `http://127.0.0.1:4173/assets/index-C-SLn6HN.css`, rendered 1 AI card, 1 AI avatar, 2 chat bubbles, 1 primary bubble, 1 secondary bubble, and 2 chat chips.
- Browser validation: old DOM counts were `0` for `.prototype-home-ai-emoji-chip`, `.chip-food`, `.chip-hotel`, `.prototype-home-ai-chat-bubble.main`, and `.prototype-home-ai-chat-bubble.sub`.
- Browser validation: `.prototype-home-ai-visual` computed `display: grid`, `grid-template-columns: 64px 672px`, and `position: static`.
- Browser validation: both emoji chips computed `position: static`, `transform: none`, `opacity: 1`, and `filter: none`, so they are no longer blurred by overlap/rotation layering.
- Browser validation: current viewport had no horizontal overflow.
- Remaining risk: the existing file still contains unrelated mojibake Korean text outside the AI card area from previous project state; this task only normalized the AI card copy and structure.

## 2026-05-26 /home AI bottom action dock layout

- Scope: implemented the selected bottom action dock direction for `AiRecommendationCard`.
- Scope: changed the AI visual structure to a top conversation row plus a centered bottom dock: `.prototype-home-ai-chat-topline` and `.prototype-home-ai-action-dock`.
- Scope: moved lodging/food chips from a right-aligned chip row into two equal-width dock chips: `🏨 숙소 포함` and `🍜 맛집 포함`.
- Scope: changed the secondary bubble from muted gray to stronger text color `#27324a` with a white translucent bubble background so it reads as AI guidance, not disabled helper text.
- Scope: normalized the corrupted `/home` Korean strings in `HomePage.tsx` while keeping existing data flow through `AppDataApi`, `useSession`, and display config helpers.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-DsKGws4i.css` and `dist/assets/index-CECfsoGZ.js`.
- Browser validation: `/home` loaded `http://127.0.0.1:4173/assets/index-DsKGws4i.css`, rendered 1 AI card, 1 `.prototype-home-ai-chat-topline`, 1 `.prototype-home-ai-action-dock`, and 2 `.prototype-home-ai-dock-chip` nodes.
- Browser validation: dock chip texts were `🏨숙소 포함` and `🍜맛집 포함`; old chip containers were `0` for `.prototype-home-ai-chat-chips`, `.prototype-home-ai-chat-chip`, and `.prototype-home-ai-emoji-chip`.
- Browser validation: `.prototype-home-ai-visual` computed `display: grid` and `min-height: 156px`.
- Browser validation: `.prototype-home-ai-action-dock` computed `display: grid`, `grid-template-columns: 339px 339px`, and appeared below the top conversation row.
- Browser validation: secondary bubble text was `혜택까지 반영해서 추천해요`, color computed `rgb(39, 50, 74)`, and background computed `rgba(255, 255, 255, 0.88)`.
- Browser validation: current viewport had no horizontal overflow.
- Remaining risk: direct multi-width browser verification at 360/390/430/1024/1440 was not run in this pass; the CSS includes a `max-width: 430px` responsive rule for the dock layout.

## 2026-05-26 red shadow cleanup across active screens

- Scope: removed red-tinted `box-shadow` effects from `frontend/src/styles/app.css`, including the direct `/trips/new` active region/style selector `.prototype-region-grid button.active`.
- Scope: removed similar red glow/shadow effects from shared controls and visual elements: `.brand-mark`, `.btn.primary`, focused `.field` / `.search-field`, auth logo/brand primary buttons, large avatar, timeline marker, trip visual, and selected map pin dot.
- Scope: kept red border/background/color state where used for active/selected meaning, but removed the `box-shadow` glow layer.
- Source validation: `rg` for red `box-shadow` values in `frontend/src/styles/app.css` returned no matches after cleanup.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-BnHVNf9S.css` and `dist/assets/index-BQMkY0nn.js`.
- Browser validation: `/trips/new` loaded the new CSS asset and computed `box-shadow: none` for both `.prototype-region-grid button.active` and `.prototype-style-choice .prototype-region-grid button.active`.
- Browser validation: computed red shadow scan returned `0` hits on `/home`, `/policies`, `/policies/dgtour-%EB%B0%80%EC%96%91-1`, `/trips`, `/trips/new`, `/trips/36`, `/mypage`, `/applied-policies`, `/login`, `/signup`, and `/forgot-password`.
- Browser validation: all checked routes reported no horizontal overflow in the current browser viewport.
- Remaining risk: the scan detects red values in computed `box-shadow`; it does not remove red fills, borders, text colors, or non-shadow design states.
## 2026-05-26 /trips detail balanced dual CTA bar

- Scope: implemented the selected balanced dual CTA bar on trip detail list timeline actions.
- Scope: replaced the direct `.timeline > button` and `.timeline > a.btn.secondary.full` placement with `.prototype-trip-action-row` containing `.prototype-trip-action-add` and `.prototype-trip-action-ai`.
- Scope: aligned both actions to the same row with `grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr)`, matching the selected wireframe where AI recommendation remains the wider primary action.
- Scope: standardized action height, radius, font weight, and no-shadow styling; the add action is neutral and the AI action uses soft red fill/border without red shadow.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `dist/assets/index-BGdARVth.css` and `dist/assets/index-DPBjVewX.js`.
- Browser validation: `/trips/36` loaded the new CSS asset and rendered 1 `.prototype-trip-action-row`, 1 `.prototype-trip-action-add`, and 1 `.prototype-trip-action-ai`.
- Browser validation: legacy direct placements were removed: `.prototype-trip-detail-screen .timeline > button` count `0` and `.prototype-trip-detail-screen .timeline > a.btn.secondary.full` count `0`.
- Browser validation: action row computed `display: grid`, `grid-template-columns: 289px 391px`, `gap: 8px`, and `margin-left: 40px`.
- Browser validation: add and AI actions both computed height `42px`, top `924px`, border-radius `14px`, and `box-shadow: none`; the AI action was wider than the add action.
- Browser validation: current viewport had no horizontal overflow.
- Remaining risk: this pass verified `/trips/36` at the current browser width only; CSS includes a `max-width: 430px` rule for smaller screens.
## 2026-05-26 - Policy detail sticky CTA background
- Scope: `/policies/:slug` sticky CTA background fix in `frontend/src/styles/app.css`.
- Root cause: `.prototype-policy-detail-screen .sticky-cta` used `color-mix(... var(--color-bg-card) 94%, transparent)`, which computed to a nearly transparent white layer and visually failed against the policy detail cream surface.
- Change: Replaced the CTA background with `var(--surface-app)` so it matches the active app surface token directly.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build emitted `/assets/index-BDD76s0w.css`.
- Browser validation: `/policies/dgtour-%EB%B0%80%EC%96%91-1` computed `.sticky-cta` background as `rgb(255, 253, 250)`, sticky count `1`, position `sticky`, bottom `72px`.
- Remaining risk: None specific to this selector; no global `.sticky-cta` rule was changed.

## 2026-05-26 - AI trip region selection wizard spec
- Scope: Documented the AI itinerary wizard region-selection UX as a travel-area based flow.
- Spec: `docs/superpowers/specs/2026-05-26-ai-trip-region-selection-wizard-design.md`.
- Decision: Broad regions such as 강원/전남/경남 should not directly generate itineraries; they should lead to a narrower travel-area selection such as 속초·고성·양양 or 여수·순천.
- Validation: Not run. This was a spec-only documentation step with no code or API changes.
- Remaining risk: Implementation still needs to confirm the current `/api/recommendations/regions` response shape and `/trips/new?region=...` parameter semantics before code changes.

## 2026-05-26 - AI trip travel-area API decision
- Scope: Updated the AI itinerary region-selection spec with the API boundary decision.
- Decision: Keep `GET /api/recommendations/regions` as the existing policy-backed region ranking API.
- Decision: Add a separate travel-area recommendation API for the AI itinerary wizard instead of changing the existing endpoint semantics.
- Decision: Add `travelAreaId` to `/trips/new` as the primary itinerary creation query, while preserving the existing `region` query for backward compatibility.
- Validation: Not run. This was a spec-only documentation step with no code or API changes.
- Remaining risk: The implementation plan still needs to define the exact route name, backend data source, and frontend fallback mapping for legacy `region` links.

## 2026-05-26 - `/trips/new?region` current implementation finding
- Scope: Documented how the current trip creation route consumes `region` before adding `travelAreaId`.
- Finding: `ItineraryCreatePage` reads `region` from query only if it exists in `tripCreateRegions`, stores it in component state/draft/profile, and sends it as `CreateTripRequest.region` through `AppDataApi.createTrip()`.
- Finding: Backend `CreateTripRequest` currently has no `travelAreaId`; `trip_service.create_trip()` stores `region` on the trip and passes the same value into `itinerary_recommendations.generate_auto_course(region=...)`.
- Finding: Auto course generation selects catalog candidates by exact `item.region == region`, so `travelAreaId` cannot be frontend-only if itinerary quality should change.
- Decision impact: `travelAreaId` should be added across frontend query/state/draft, API boundary, backend schema/service, and auto-course resolution while preserving legacy `region` links.
- Validation: Not run. This was a code-reading/spec documentation step only.
- Remaining risk: Need to decide whether the trip DB keeps only `region` plus resolved display name, or stores `travel_area_id` in a schema migration.

## 2026-05-26 - AI trip travel-area storage and source-of-truth decision
- Scope: Updated the AI itinerary region-selection spec with the storage and catalog ownership decision.
- Decision: Add nullable `trips.travel_area_id` in v1 instead of keeping `travelAreaId` frontend-only.
- Decision: Keep `trips.region` as the human-readable travel-area display name, for example `Sokcho-Goseong-Yangyang`, while `travel_area_id` remains the stable system identifier.
- Decision: Use `backend/app/data/travel_areas.py` as the v1 source of truth; frontend must consume travel-area data through API rather than duplicating the catalog.
- Decision: Do not create a normalized `travel_areas` DB table in v1; defer table/admin management until the catalog needs runtime operations.
- Validation: Not run. This was a spec-only documentation step with no code/API/schema changes.
- Remaining risk: The implementation plan must define the exact Alembic migration, API response schema, and legacy `region` fallback behavior.

## 2026-05-26 - AI travel-area test scope expansion
- Scope: Expanded the AI itinerary region-selection spec so travel-area API tests are not Gangwon-only.
- Decision: v1 test coverage must include single-city areas, special island areas, broad provinces, duplicate place names, and weak-policy-data regions.
- Added coverage: `sido` tests for Gangwon, Jeonnam, Gyeongnam, Gyeongbuk, Jeju, Busan, Seoul, and unsupported regions.
- Added coverage: search tests for Sokcho, Yeosu, Tongyeong, Gyeongju, Jeju, duplicate Goseong, and no-match queries.
- Added coverage: nationwide recommendation and policy scoring tests that verify catalog fallback and prevent nationwide policies from over-inflating every area.
- Validation: Not run. This was a spec-only documentation update.
- Remaining risk: Korean text in this checklist file has existing encoding issues in older entries; this entry is ASCII-focused to avoid adding more mojibake.

## 2026-05-26 - travel-area API detail design
- Scope: Added detailed API design for `GET /api/recommendations/travel-areas` to the AI itinerary region-selection spec.
- Decision: Use one structured endpoint supporting `sido`, `query`, `mode=nationwide`, `style`, and `limit` instead of separate endpoints.
- Decision: Request priority is `query > sido > mode=nationwide > default nationwide`; when `query` and `sido` are both present, `sido` limits the search scope.
- Decision: Response includes `mode`, `sido`, `query`, `items`, and `emptyReason`, with each item carrying `travelAreaId`, display name, included cities, tags, reason, policy counts, estimated value, and score.
- Decision: Policy scoring prioritizes city matches, then sido matches, deadline/value/style, with nationwide policies included but low-weighted to avoid over-inflating all areas.
- Validation: Not run. This was a spec-only documentation update.
- Remaining risk: Implementation plan must map existing `ExternalSourceRecord` fields into city/sido/nationwide counts deterministically.

## 2026-05-26 - TravelArea catalog design
- Scope: Added the v1 `backend/app/data/travel_areas.py` catalog design to the AI itinerary region-selection spec.
- Decision: `TravelArea` fields are `id`, `name`, `sido`, `included_cities`, `aliases`, `tags`, `styles`, `summary`, and `priority`.
- Decision: v1 starts with about 31 nationwide representative travel areas rather than all Korean cities/counties.
- Decision: Search checks id, name, sido, included cities, aliases, tags, and styles with exact matches ranked before partial/tag/style matches.
- Decision: Separate user-facing `tags` from scoring-oriented `styles`; v1 style taxonomy is sea, mountain, history, food, healing, activity, family, photo, city, and island.
- Decision: Duplicate place names such as Goseong return multiple travel areas and the UI should show `sido` plus included cities for disambiguation.
- Validation: Not run. This was a spec-only documentation update.
- Remaining risk: The implementation plan needs to translate the Korean catalog into deterministic Python data while preserving UTF-8 encoding.

## 2026-05-26 - AI travel-area wizard implementation plan
- Scope: Wrote the implementation plan for the travel-area based AI itinerary wizard.
- Plan: `docs/superpowers/plans/2026-05-26-ai-trip-travel-area-wizard.md`.
- Contents: backend catalog/service/API tests, trip `travel_area_id` persistence, frontend AppDataApi boundary, `/trips/new` Wizard changes, contract updates, validation checklist.
- Validation: Not run. This was a plan-only documentation step with no production code changes.
- Remaining risk: Plan execution will require careful UTF-8 handling for Korean catalog data and may need adjustment to the existing frontend test mock structure.

## 2026-05-26 - Wave 1 docs contract draft
- Scope: Added a travel-area itinerary API addendum to `docs/mvp-api-contract.md` while Wave 1 code agents run in parallel.
- Contract: Documents `GET /api/recommendations/travel-areas`, request priority, response shape, empty reasons, and `POST /api/trips.travelAreaId` behavior.
- Validation: Not run yet. This is a documentation draft; final validation belongs to Wave 3.
- Remaining risk: The addendum may need to be moved into the canonical Korean section after implementation stabilizes, because older content in the contract file already contains encoding-damaged text.

## 2026-05-26 - AI travel-area wizard Wave 1 integration
- Scope: Integrated Wave 1 parallel work for backend travel-area API, trip `travel_area_id` persistence, frontend AppDataApi boundary, and contract draft.
- Backend validation: `cd backend; python -m pytest tests/test_travel_areas.py tests/test_travel_area_recommendation_routes.py tests/test_trip_db_service.py -q` passed with `54 passed, 1 warning`.
- Frontend validation: `cd frontend; npm run typecheck` passed.
- Notes: Pytest emitted a cache write warning under `backend/.pytest_cache`, but tests passed.
- Remaining risk: Wave 2 still needs `/trips/new` UI integration and itinerary catalog support before end-to-end validation.

## 2026-05-26 Travel area wizard parallel implementation

- Implemented travel-area API/data source, trip `travelAreaId` persistence, frontend API boundary, `/trips/new` travel-area wizard UI, and itinerary catalog support.
- Cleaned `backend/app/data/itinerary_catalog.py` to remove mojibake catalog rows and restore legacy 제주/부산 auto-course expectations while adding v1 travel-area catalog entries.
- Updated stale frontend App assertions for the current trip detail action button, home search copy, and emoji profile badge.
- Validation:
  - `cd backend; python -m pytest tests/test_travel_areas.py tests/test_travel_area_recommendation_routes.py tests/test_itinerary_recommendations.py tests/test_trip_db_service.py -q` => PASS, 60 passed.
  - `cd frontend; npm run typecheck` => PASS.
  - `cd frontend; npm test -- --run src/App.test.tsx` => PASS, 105 passed.
  - `docker compose -f compose.yaml up -d --build` => PASS, backend/frontend rebuilt and started, backend healthy.
  - Browser smoke: `/home`, `/trips/new?region=강원`, `/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang`, `/trips`, `/mypage` => PASS.
- Browser smoke details:
  - `/trips/new?region=강원`: 권역 선택 제목 표시, `속초·고성·양양` 포함, `.prototype-travel-area-card` count 4.
  - `/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang`: `속초·고성·양양` 표시, active travel-area card count 1, invalid status 없음.
- Remaining risk:
  - App tests use a shared backend-backed test database; stateful saved-policy tests now explicitly clear the target policy before asserting save behavior.
  - The v1 itinerary catalog is still static source data and should be expanded independently from API contract changes when more 권역 coverage is needed.

## 2026-05-26 /trips/new travel-area UX continuity

- Wrote the work spec: `docs/superpowers/specs/2026-05-26-trips-new-travel-area-ux-continuity-design.md`.
- Wrote the implementation plan: `docs/superpowers/plans/2026-05-26-trips-new-travel-area-ux-continuity.md`.
- Patched `/trips/new` so region selection clears stale `travelAreaId` query state, and travel-area selection syncs `region` + `travelAreaId` into the URL while preserving draft behavior.
- Added App tests for travel-area draft restore and direct `travelAreaId` -> normal region switching.
- Validation not run in this pass because the user asked to start the patch but did not request verification.
- Suggested validation when requested:
  - `cd frontend; npm run typecheck`
  - `cd frontend; npm test -- --run src/App.test.tsx -t travel-area`

## 2026-05-26 - /trips/new travel-area UX continuity validation

- Frontend typecheck: PASS (`cd frontend; npm run typecheck`).
- Travel-area related App tests: PASS (`cd frontend; npm test -- --run src/App.test.tsx -t travel`, 6 passed, 101 skipped).
- Docker rebuild/restart: PASS (`docker compose -f compose.yaml up -d --build`).
- Remaining risk: no browser smoke was requested in this pass; UI-level confirmation for `/trips/new` can be run separately if needed.
## 2026-05-26 - /trips/new primary region first and course preference later

- Implementation: IN PROGRESS.
- Changed first step to broad/representative region selection and removed the course preference block from the first screen.
- Moved course preference to the new second step, shifting date selection to step 3 and title/create confirmation to step 4.
- Added/updated App tests for first-screen responsibility, course preference placement, and 4-step create flow expectations.
- Validation: not run in this pass because the user asked to start implementation, not to run checks.
- Remaining risk: run `cd frontend; npm run typecheck` and focused `App.test.tsx` checks before treating this as complete.
## 2026-05-26 - /trips/new 4-step flow follow-up

- Implementation: updated remaining create-flow test patterns that still moved from destination to title/create with only two `다음` clicks.
- Plan tracking: marked implemented plan steps as completed; validation steps remain unchecked.
- Validation: not run in this pass. Required before completion: `cd frontend; npm run typecheck`, `cd frontend; npm test -- --run src/App.test.tsx -t travel`, and browser smoke for `/trips/new`.
## 2026-05-26 - /trips/new 4-step flow click normalization

- Implementation: normalized `/trips/new` App test create-flow navigation so full create paths use at most three `다음` clicks before `일정 만들기`.
- Validation: not run in this pass. Still required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new primary region travelAreaId convergence

- Implementation: changed all primary first-step regions to require travel-area convergence through `tripCreatePrimaryRegionValues`.
- Implementation: added single-candidate auto-selection so representative regions such as `부산` can resolve to `busan-all` without an extra redundant click.
- Tests: updated stale direct `travelAreaId` switching coverage so changing to `부산` now expects `region: "부산 전체"` and `travelAreaId: "busan-all"`.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new direct travelAreaId requery guard

- Implementation: added a guard so an already resolved direct `travelAreaId` does not trigger a duplicate query after `selectedTravelArea` is applied.
- Implementation: kept the existing travel-area recommendations visible when the direct `travelAreaId` is already resolved, instead of clearing the card list.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new default primary region convergence

- Implementation: default `/trips/new` entry now uses the initial selected region as a travel-area query source when it is one of the primary regions.
- Reason: without this, a user could enter with profile region `부산` and proceed as a plain region-only trip, bypassing the intended `travelAreaId` convergence.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new default primary region regression test

- Tests: added App test coverage that default `/trips/new` entry resolves the profile default primary region `부산` through travel-area recommendations and auto-selects `부산 전체`.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new legacy city region query convergence

- Implementation: added `travelAreaChoiceQuery` so legacy city-like `region` query values such as `경주` and `강릉` use travel-area search instead of plain region-only creation.
- Tests: added App coverage for `/trips/new?region=경주` resolving through `listTravelAreaRecommendations({ query: "경주" })` and auto-selecting the returned travel area.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new restored travel-area query cleanup

- Implementation: when a travel area is restored from draft, `travelAreaChoiceQuery` is cleared so the restored `travelAreaId` state remains authoritative.
- Reason: prevents legacy query state from surviving after a concrete travel-area has been restored.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new selected travel-area requery suppression

- Implementation: once `selectedTravelArea` is set, the travel-area loading effect no longer issues another `sido` or legacy query request until the user changes the primary region.
- Reason: prevents duplicate recommendation calls and candidate-list flicker after auto-selecting a single-candidate region such as `부산 전체`.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new restored travel-area list hydration

- Implementation: refined the duplicate-query guard so a restored `selectedTravelArea` only suppresses fetching when the current recommendation list already contains that selected area.
- Reason: draft restore can have a selected travel area but an empty candidate list; in that case the list still needs to hydrate from `sido` so the active card remains visible.
- Safety: kept `travelAreaRecommendations` out of the effect dependency list to avoid repeated empty-list state updates when no query is available.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new stale restored travel-area recovery

- Implementation: when a restored or previously selected travel area is no longer present in the hydrated recommendation response, the flow now recovers instead of repeatedly querying.
- Behavior: if the response has one candidate, it auto-selects that candidate; if it has multiple candidates, it clears the stale selected travel area so the user must choose again.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new Sokcho legacy destination query

- Implementation: allowed `region=속초` as a legacy travel-area search query so existing home destination links can still resolve into a concrete travel area.
- Tests: added App coverage for `/trips/new?region=속초` calling `listTravelAreaRecommendations({ query: "속초" })` and auto-selecting `속초·고성·양양`.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new Gangneung legacy destination query

- Tests: added App coverage for `/trips/new?region=강릉` resolving through `listTravelAreaRecommendations({ query: "강릉" })` and auto-selecting `강릉·동해·삼척`.
- Reason: existing destination links may still use city-like legacy `region` values; these must converge to concrete `travelAreaId` selections.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new legacy query allowlist cleanup

- Implementation: replaced dependency on the old mixed `tripCreateRegions` query allowlist with explicit primary-region values plus explicit legacy city query values: `속초`, `경주`, `강릉`.
- Reason: the first screen no longer uses the old mixed city/region list, so query compatibility should be managed directly instead of by reusing that legacy UI list.
- Validation: not run in this pass. Required before completion: frontend typecheck and focused App tests.
## 2026-05-26 - /trips/new primary region description styling

- Implementation: added CSS for primary-region button `small` descriptions so the first-step broad region cards render with controlled typography instead of browser defaults.
- Validation: not run in this pass. Required before completion: frontend typecheck, focused App tests, and browser smoke for `/trips/new`.
## 2026-05-26 - /trips/new validation after primary-region wizard changes

- Validation: `cd frontend; npm run typecheck` passed.
- Validation: `cd frontend; npm test -- --run src/App.test.tsx` passed with 113 tests.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build also ran `npm run typecheck && vite build`.
- Browser smoke: first check on `http://127.0.0.1:4173/trips/new?region=부산` showed stale Docker UI, so containers were rebuilt before final browser validation.
- Browser smoke after rebuild: `/trips/new?region=부산` shows broad primary regions first, no course-preference heading on the first step, one `부산 전체` travel-area card, enabled `다음`, and after clicking `다음` the flow moves to `어떤 코스를 선호하나요?`.
- Remaining risk: no additional browser smoke was run for every legacy query path (`속초`, `강릉`, `경주`); these are covered by `App.test.tsx`.
## 2026-05-26 - 재검증 재실행 (model update)

- Scope: re-run validation after requested model update.
- Validation: `cd frontend; npm run typecheck` passed.
- Validation: `cd frontend; npm test -- --run src/App.test.tsx` passed, 113 tests.
- Validation: `docker compose -f compose.yaml up -d --build` passed and containers restarted cleanly (`travel-hunter-app-backend-1` and `travel-hunter-app-frontend-1` recreated).
- Remaining risk: full browser-level manual UX smoke was not re-run in this cycle; previous `/trips/new` browser verification remains from the earlier run.
## 2026-05-26 - browser UX smoke + wireframe capture

- Scope: manual browser smoke with Playwright screenshots under auth and login-state fallback.
- Login check: `test.user@example.com / password123` can authenticate successfully and reach `/home`.
- Authenticated wireframe captures: `home-desktop.png`, `trips-new-desktop-01.png`, `trips-new-desktop-02-step2.png`, `trips-new-mobile-01.png`, `trips-new-mobile-02-step2.png`, `policies-desktop.png`, `trips-desktop.png`, `mypage-desktop.png`.
- `/trips/new` flow check:
  - Initial route with `region=부산` is normalized to `travelAreaId=busan-all`.
  - Step 1 heading/text shows `새 일정 1/4` and `어디로 떠나볼까요?`.
  - Selecting `부산 전체` and clicking `다음` moves to step 2 (`새 일정 2/4`, `어떤 코스를 선호하나요?`).
- Unauthenticated route smoke notes: when not logged in, protected routes (`/home`, `/policies`, `/trips`, `/mypage`) redirect to the login layout as expected.
- Remaining check: `/trips/new` mobile desktop step progression looks correct after explicit `다음`, and the updated screenshots were saved for visual comparison.

## 2026-05-26 - /trips/new draft restore removal

- Scope: removed the trip creation draft restore UI and localStorage persistence from `/trips/new`.
- Implementation: `ItineraryCreatePage.tsx` no longer imports or calls `draftStorage`, no longer renders `DraftRestoreNotice`, and no longer restores/saves/clears `travel-hunter:draft:trip-create:*` keys.
- Tests: removed App tests that expected trip creation draft restore/discard behavior. Other draft flows, such as trip detail place add/edit drafts, remain untouched.
- Backend/DB: no backend table, column, route, or migration was involved; this feature was frontend `localStorage`, not PostgreSQL-backed state.
- Validation: `cd frontend; npm run typecheck` passed.
- Remaining risk: browser smoke for `/trips/new` after this specific removal has not been run yet.

## 2026-05-27 - Trip create participant count

- Scope: added planned travel party size to `/trips/new` as an inline participant stepper on the date step.
- Implementation: `participantCount` is stored on trips and exposed through the Trip DTO; `people` remains the real member/invite nickname list and was not used for fake participants.
- Frontend: Step 3 now shows the inline 1~6 person stepper and a normalized date/participant summary; Step 4 summary and `/trips` cards use `participantCount`.
- Backend/DB: added `trips.participant_count` via Alembic revision `0014_add_trip_participant_count`, defaulting existing rows to 1.
- Validation: `cd frontend; npm run typecheck` passed.
- Validation: `cd frontend; npm test -- --run src/App.test.tsx` passed with 111 tests.
- Validation: `cd backend; python -m pytest tests/test_trip_db_routes.py tests/test_trip_db_service.py` passed with 66 tests.
- Validation: `cd backend; alembic upgrade head --sql` passed and emitted `ALTER TABLE trips ADD COLUMN participant_count INTEGER DEFAULT '1' NOT NULL`.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build ran typecheck and Vite build successfully.
- Browser smoke: `/trips/new` Step 3 showed `여행 인원 3명`, Step 4 summary showed `인원 · 3명`, and the created `/trips` card showed `👥 3명 참여`.
- Remaining risk: existing trip detail header still displays actual member count from `people`; this was intentionally left unchanged because this task scoped list cards only.

## 2026-05-27 - Trip detail policy recommendation priority

- Scope: changed `/trips/{id}` `recommendedPolicies` ranking from nationwide/amount/deadline-first to travel-area-aware scoring.
- Implementation: `travelAreaId` now resolves through `travel_areas.get_travel_area()` and ranks policy candidates by current area terms before using benefit amount and deadline as tie-breakers.
- Safety: policies with other destination names or unverified conditional eligibility terms such as `다자녀`, `장애인`, `휠체어`, `임산부`, and `청년` are downranked instead of receiving new UI labels.
- Compatibility: existing trips without `travelAreaId` keep exact `trip.region == policy.region` filtering when exact region candidates exist.
- Validation: `cd backend; python -m pytest tests/test_trip_db_service.py -q` passed with 45 tests.
- Validation: `cd backend; python -m pytest tests/test_trip_db_routes.py -q` passed with 23 tests.
- Remaining risk: no DTO field explains why a policy was downranked; a future UI label such as `조건 확인 필요` should be handled as a separate API/UI change.
- Validation: `docker compose -f compose.yaml up -d --build` passed and recreated backend/frontend containers.
- Smoke: container service check for trip `99` now returns top recommendations in `강원` (`travelmonth-36`, `travelmonth-30`); the previous 제주/다자녀 policy is no longer in the top two.

## 2026-05-27 - Trip detail recommendation card count and empty state

- Scope: `/trips/{id}` recommendation cards now show up to 3 score-qualified policies instead of filling weak matches.
- Implementation: `_recommended_policies()` now defaults to `limit=3` and filters `travelAreaId` trips to candidates with score `>= 40` before sorting by score, deadline, and id.
- Frontend: empty recommendation fallback now says `이 일정에 어울리는 정책이 없어요` while keeping the `/policies` fallback card link.
- Test hardening: narrowed one policy trip-picker App test selector from broad `/제주/` to `/제주 3일 여행/` because persistent generated trips can create multiple 제주 rows.
- Validation: `cd backend; python -m pytest tests/test_trip_db_service.py -q` passed with 47 tests.
- Validation: `cd backend; python -m pytest tests/test_trip_db_routes.py -q` passed with 23 tests.
- Validation: `cd frontend; npm run typecheck` passed.
- Validation: `cd frontend; npm test -- --run src/App.test.tsx` passed with 111 tests after the selector hardening.
- Remaining risk: score reasons are still not exposed in the DTO; explanatory UI labels remain a separate future API/UI task.
- Validation: `docker compose -f compose.yaml up -d --build` passed; frontend build ran typecheck and Vite build, backend/frontend containers restarted cleanly.
- Smoke: container service check for trip `99` returned 3 score-qualified `강원` recommendations (`travelmonth-36`, `travelmonth-30`, `travelmonth-20`); the 제주/다자녀 policy is not included.
