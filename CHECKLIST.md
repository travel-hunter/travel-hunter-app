# CHECKLIST

## Current Status

- Latest validated scope: Kakao shared map UI for `/trips/:id?view=map` and `/ai-results?tripId=...`.
- Last validation date: 2026-05-28.
- Historical checklist archive was removed during repo slimming; this file now keeps only current status, latest validations, and remaining risks.

## Latest Validations

- Deep-interview refinement on 2026-05-28: expanded Kakao Map First Pass requirements to include backend Kakao Local coordinate generation/storage/API response verification while allowing catalog fallback to remain coordinate-less with frontend graceful fallback.
- Deep-interview artifact validation on 2026-05-28: confirmed updated `.omx/specs/deep-interview-travel-hunter-kakao-map.md`, `.omx/plans/prd-kakao-map-first-pass.md`, and `.omx/plans/test-spec-kakao-map-first-pass.md` include Kakao Local, latitude/longitude, and catalog fallback scope. No code tests were run because this pass only updated planning/interview artifacts.
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
- Kakao Map First Pass continuation on 2026-05-28: added `frontend/src/components/map/KakaoMapView.test.tsx` for Kakao SDK map/marker initialization, overlay and SDK marker click selection, coordinate fallback, and missing-key fallback.
- Kakao Map First Pass continuation on 2026-05-28: documented safe `VITE_KAKAO_MAP_JS_KEY=` placeholder in `frontend/.env.example`; no secret value was added.
- Kakao Map First Pass continuation on 2026-05-28: added `backend/tests/test_trip_db_service.py::test_create_trip_returns_persisted_kakao_coordinates_from_db` to prove generated Kakao Local coordinates persist to `TripPlace` rows and return through the create-trip API payload.
- Kakao Map First Pass review follow-up on 2026-05-28: updated `docs/mvp-api-contract.md` and `.agent/evals/api-contract-golden.json` so itinerary place shapes include existing `sourceProvider` and `externalPlaceId` response metadata.
- Kakao Map First Pass review follow-up on 2026-05-28: added `frontend/src/lib/kakaoMap.test.ts` for Kakao Maps loader key detection, script injection, `maps.load` resolution, and script error rejection.
- Kakao Map First Pass review follow-up on 2026-05-28: clarified in `docs/mvp-api-contract.md` that external place identity is scoped by `(sourceProvider, externalPlaceId)`, loosened component tests to avoid pinning SDK readiness internals, and hardened the Vitest localStorage shim with method probes.
- Kakao Map First Pass validation on 2026-05-28: `cd frontend; npm run typecheck` passed.
- Kakao Map First Pass validation on 2026-05-28: `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/lib/kakaoMap.test.ts src/components/map/KakaoMapView.test.tsx` passed with 6 tests, including explicit no-key stubs for hermetic fallback cases. Vitest emitted a Node/localStorage warning; `frontend/src/test/setup.ts` now installs a hardened memory localStorage fallback when the runner exposes an incomplete or throwing `window.localStorage`.
- Kakao Map First Pass validation on 2026-05-28: `cd frontend; npm run build` passed.
- Kakao Map First Pass validation on 2026-05-28: `cd backend; .venv/bin/python -m pytest tests/test_trip_db_service.py tests/test_itinerary_recommendations.py tests/test_kakao_local.py` passed with 72 tests.
- Kakao Map First Pass validation on 2026-05-28: `python3 -m json.tool .agent/evals/api-contract-golden.json` passed.
- Kakao Map First Pass validation on 2026-05-28: `git diff --check` passed.
- Kakao Maps JavaScript SDK local connection check on 2026-05-28: `frontend/.env` contains `VITE_KAKAO_MAP_JS_KEY` without exposing the value; after adding local Web platform domains in the Kakao developer console, direct SDK fetch and referer checks for `http://127.0.0.1:5173/` and `http://localhost:5173/` returned 200.
- Kakao Maps display hardening on 2026-05-28: updated `.kakao-map-view`/canvas sizing plus trip-detail and AI-candidate map container styles so SDK maps have stable visible height when key, domain, and coordinates are valid.
- Kakao Maps display validation on 2026-05-28: `cd frontend; npm run typecheck`, `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/lib/kakaoMap.test.ts src/components/map/KakaoMapView.test.tsx`, and `cd frontend; npm run build` passed; generated `frontend/dist/` was removed afterward.
- Kakao Maps AI results continuation on 2026-05-28: `/ai-results?tripId=...` candidate map markers now pass `candidate.address || candidate.title` as a Kakao services query, and the shared map component resolves missing coordinates through the JavaScript SDK `services` library before rendering the SDK map.
- Kakao Maps AI results validation on 2026-05-28: `cd frontend; npm run typecheck`, `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/lib/kakaoMap.test.ts src/components/map/KakaoMapView.test.tsx`, `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|selected AI candidate"`, `cd frontend; npm run build`, and `git diff --check` passed.
- Kakao Maps all-schedules ralplan on 2026-05-28: created `.omx/plans/prd-all-schedules-kakao-map.md`, `.omx/plans/test-spec-all-schedules-kakao-map.md`, and `.omx/plans/ralplan-handoff-all-schedules-kakao-map.json`; Architect and Critic both approved after making the trip-detail coordinate-less regression mandatory.
- Kakao Maps all-schedules implementation on 2026-05-28: trip-detail day map markers now pass `place.address || place.label` as a Kakao services query so `/trips/:id?view=map` can render the shared Kakao map for coordinate-less existing schedule places.
- Kakao Maps all-schedules validation on 2026-05-28: `cd frontend; npm run typecheck`, `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/lib/kakaoMap.test.ts src/components/map/KakaoMapView.test.tsx`, `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "trip detail coordinate-less Kakao map|AI additional candidates|selected AI candidate"`, `cd frontend; npm run build`, and `git diff --check` passed; generated `frontend/dist/` was removed afterward.

- Local DB maintenance on 2026-05-28: deleted all owned trips for `test.user@example.com` (50 trips: ids 55-62, 69-77, 79-88, 100-102, 105-106, 108-122, 126-129), detached 50 recommendations, and removed related trip days, places, memberships, policies, and invites.
- Local DB maintenance validation on 2026-05-28: verified `test.user@example.com` still exists and has `remaining_owned_trips=0`, `remaining_trip_memberships=0`, and `remaining_recommendations_attached_to_deleted_trips=0`.

- Kakao Maps pin-label implementation on 2026-05-28: shared `KakaoMapView` now creates Kakao `CustomOverlay` label buttons for SDK-backed markers so every shared map pin shows `marker.label` by default; labels use bounded `.kakao-map-place-label` styles with mobile max-width and ellipsis for long names.
- Kakao Maps pin-label validation on 2026-05-28: `cd frontend; npm run typecheck`, `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/components/map/KakaoMapView.test.tsx src/lib/kakaoMap.test.ts` (10 tests), `cd frontend; VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "trip detail coordinate-less Kakao map|AI additional candidates|selected AI candidate"` (4 selected tests), `cd frontend; npm run build`, and `git diff --check` passed; generated `frontend/dist/` was removed afterward.

## Remaining Risks

- Kakao Maps SDK rendering depends on the configured JavaScript key and allowed web domains.
- If the Kakao SDK fails to load, the shared map component falls back to the existing CSS map UI.
- The worktree contains many unrelated pre-existing changes; this checklist cleanup only archived and summarized `CHECKLIST.md`.
- The removed `scripts/local-recommendation-smoke.ps1` was a local helper, not a CI gate. Recreate a current smoke script later if deployment verification needs a single command.
- Local `deploy/.env.staging` and `deploy/.env.tunnel` files exist in the working directory. They were not read during cleanup and must remain uncommitted.
- The e2e runner still emits Windows `ConnectionResetError` noise when closing async transports after Playwright completes; the latest run completed with 9/9 tests passed and exit code 0.
- Docker Desktop must be running for the frontend test helper path that starts compose PostgreSQL.
- Local `.pytest_cache` directories can emit Windows permission warnings during pytest cache cleanup; they are ignored and should remain uncommitted.
- `docker compose -f compose.yaml config --quiet` remains blocked in this WSL distro until Docker Desktop WSL integration is enabled; the 2026-05-28 Kakao Map continuation attempt failed with Docker not found in WSL.
- Direct `npx vitest run src/App.test.tsx` without the backend test wrapper is not a valid full app regression in the current backend-mode frontend because login/API flows need the FastAPI test backend; the backend wrapper path is currently blocked by Docker availability.
- Additional non-local Kakao Maps browser origins, such as preview/staging/production domains, must be added separately in the Kakao developer-console Web platform settings.

## 2026-05-28 - /ai-results design deep interview

- [x] Captured deep-interview decisions for `/ai-results` design unification.
- [x] Wrote execution-ready plan: `.omx/specs/deep-interview-ai-results-design-unification.md`.
- [x] Wrote transcript: `.omx/interviews/ai-results-design-unification-20260528T0626Z.md`.
- [x] Implementation started under `$ralph`; route UI PRD/test spec created at `.omx/plans/prd-ai-results-design-unification.md` and `.omx/plans/test-spec-ai-results-design-unification.md`.
- [x] `/ai-results` now uses itinerary-detail-aligned hero/status/workspace styling, linked map/candidate planning rail, Day-choice panel, and compact current-itinerary preview.
- [x] Added App.test assertions for the AI results route shell, flow panel, map section, and Day-choice CTA.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|selected AI candidate|opens a Day picker|keeps users on AI results|opens the AI recommendation criteria sheet"` (4 selected tests).
- [x] Validation passed: `cd frontend && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Validation passed: `git diff --check`.
- [ ] Full `cd frontend && npm test` remains blocked because Docker is not available in this WSL distro for the backend test wrapper.

- [x] Ralph architect verification passed with non-blocking WATCH risks for responsive browser evidence and full Docker-backed test availability.
- [x] Deslop pass completed on Ralph-owned files: centralized candidate selection behavior and prevented already-added candidates from reopening the Day-add panel while preserving map/card selection.
- [x] Post-deslop validation passed: `cd frontend && npm run typecheck && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|selected AI candidate|opens a Day picker|keeps users on AI results|opens the AI recommendation criteria sheet" && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Temporary live-backend responsive-check trip cleanup verified: `AI 결과 반응형 확인` remaining trip count is 0.
- [ ] Browser viewport check script could not launch Playwright Chromium because this WSL environment is missing `libasound.so.2`; no persistent test trip was left behind.
- [ ] Direct full `VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx` currently has unrelated failures in policy/invite tests; AI results tests pass.

## 2026-05-28 - /ai-results A map-first design planning

- [x] Fixed selected Visual Companion A’’’ map-first/slim Day bar design as the implementation target.
- [x] Wrote design spec: `docs/superpowers/specs/2026-05-28-ai-results-map-first-design.md`.
- [x] Wrote Superpowers implementation plan: `docs/superpowers/plans/2026-05-28-ai-results-map-first-redesign.md`.
- [x] Wrote deep-interview handoff spec: `.omx/specs/deep-interview-ai-results-a-map-first-plan.md`.
- [ ] No code validation run for this planning-only step; implementation validation is defined in the plan.

## 2026-05-28 - /ai-results A map-first implementation

- [x] Implemented selected A’’’ map-first `/ai-results` UI: compact header/status counts, map-first workspace, selected candidate summary overlay, slim Day add bar, duplicate state, current Day preview, and simplified criteria sheet copy.
- [x] Updated `/trips/{id}` entry CTA copy to `✨ 추천 후보 추가` while preserving `/ai-results?tripId={id}` navigation.
- [x] Added/updated App.test coverage for the compact AI candidate shell, slim Day bar add flow, duplicate candidate state, criteria sheet trigger/heading, and itinerary detail CTA copy.
- [x] Confirmed no API/backend contract shape change was needed; implementation uses existing `Recommendation`, `Trip`, and `addTripPlace` fields.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|slim Day bar|already-added AI candidates|opens an AI recommendation criteria sheet|ai-results"` (4 selected tests).
- [x] Validation passed: `cd frontend && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Validation passed: `git diff --check`.
- [ ] Full `cd frontend && npm test` remains blocked because Docker is not available in this WSL distro for the backend test wrapper.
- [ ] Direct full `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run` is not a valid full backend-mode regression here and currently still fails unrelated existing trip-create/invite tests; the AI-results targeted suite passes.

## 2026-05-28 - /ai-results compact chrome removal

- [x] Removed `/ai-results` `.ai-results-compact-head` from the content area as requested.
- [x] Removed the map-column `.ai-section-head` above the candidate map as requested.
- [x] Updated AI-results regression expectations so the removed status header/buttons are no longer required.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|slim Day bar|already-added AI candidates|opens an AI recommendation criteria sheet|ai-results"` (4 selected tests).
- [x] Validation passed: `cd frontend && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Validation passed: `git diff --check -- frontend/src/pages/itinerary/AiResultsPage.tsx frontend/src/App.test.tsx`.

## 2026-05-28 - /ai-results Kakao official place description interview

- [x] Clarified that the first pass must use official Kakao Maps/Local API fields only.
- [x] Confirmed that API/frontend type changes are allowed for official Kakao fields such as category name and phone.
- [x] Recorded non-goals: no scraping, no alternative provider, no AI-generated review text, and no existing `aiReview`/`reason` in candidate-card description.
- [x] Wrote handoff spec: `.omx/specs/deep-interview-ai-results-kakao-place-description.md`.
- [x] Wrote transcript: `.omx/interviews/ai-results-kakao-place-description-20260528T0802Z.md`.
- [ ] No code validation was run for this interview-only artifact; implementation requires API contract, backend, frontend type, UI, and test updates.

## 2026-05-28 - /ai-results Kakao official place description implementation

- [x] Added official Kakao Local metadata fields `categoryName` and `phone` to recommendation DTO handling, backend schema, frontend type, API contract, and golden contract eval.
- [x] Mapped Kakao Local `category_name` and `phone` through `KakaoLocalPlace` -> `ExternalPlaceCandidate` -> `Recommendation` without scraping or alternate providers.
- [x] Replaced visible `/ai-results` candidate-card recommendation rationale text with official place metadata; existing `aiReview`/`reason` remains hidden in that description position.
- [x] Updated the Day-add place payload meta to use the same official place description so newly added itinerary rows do not show AI-generated review text.
- [x] Validation passed: `cd backend && .venv/bin/python -m pytest tests/test_kakao_local.py tests/test_itinerary_recommendations.py tests/test_trip_db_service.py -q` (72 passed).
- [x] Validation passed: `cd backend && .venv/bin/python -m pytest -q` (399 passed).
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates"` (1 selected test).
- [x] Validation passed after payload-meta update: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|slim Day bar"` (2 selected tests).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Validation passed: `cd frontend && PATH="<tmp docker wrapper>:$PATH" PYTHON="../backend/.venv/bin/python" VITE_KAKAO_MAP_JS_KEY=real-ci-key npm test -- --run` (143 tests passed; wrapper points `docker` to Windows Docker CLI because WSL `docker` command is not installed).
- [x] Validation passed: `python3 -m json.tool .agent/evals/api-contract-golden.json` and `git diff --check` on changed files.
- [ ] Remaining risk: Kakao official APIs still do not provide rating or representative review fields, so the UI can only display official place metadata currently exposed by Kakao Local/Maps responses.

## 2026-05-28 - /ai-results floating Day picker implementation

- [x] Fixed deep-interview implementation target from `.omx/specs/deep-interview-ai-results-floating-day-picker.md`: remove `.ai-slim-day-add`, move add action into each candidate row, and use an anchored Day popover with explicit confirmation.
- [x] Added RED-first App.test coverage for absent `.ai-slim-day-add`, candidate-scoped `추가` button, duplicate add blocking, Day-popover open behavior, no immediate add on Day selection, confirm-driven `addTripPlace`, and map/card selection sync.
- [x] Implemented frontend-only `/ai-results` changes in `AiResultsPage.tsx` through the existing `AppDataApi.addTripPlace` flow; no API/backend/DTO contract change made for this UI task.
- [x] Replaced invalid nested-button risk with a candidate wrapper plus separate accessible select/add buttons.
- [x] Added `.ai-day-popover` styling and removed dead `.ai-slim-day-add` / `.ai-slim-add-button` CSS during the scoped cleanup pass.
- [x] Validation passed: RED observed before implementation with `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|inline add button|already-added AI candidates|selected AI candidate|adding a recommendation fails"` (failed because old slim Day card rendered and new controls did not exist).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|inline add button|already-added AI candidates|selected AI candidate|adding a recommendation fails"` (5 selected tests passed).
- [x] Validation passed: `cd frontend && PATH="<tmp docker wrapper>:$PATH" PYTHON="../backend/.venv/bin/python" VITE_KAKAO_MAP_JS_KEY=real-ci-key npm test -- --run` (143 tests passed; wrapper points `docker` to Windows Docker CLI because WSL `docker` command is not installed).
- [x] Validation passed: `cd frontend && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Validation passed after cleanup: `cd frontend && npm run typecheck && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|inline add button|already-added AI candidates|selected AI candidate|adding a recommendation fails" && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Validation passed: `git diff --check`.
- [ ] `cd frontend && PATH="<tmp docker wrapper>:$PATH" PYTHON="../backend/.venv/bin/python" VITE_KAKAO_MAP_JS_KEY=real-ci-key npm run test:e2e` remains blocked in this WSL environment because Playwright Chromium cannot load `libasound.so.2`; backend and Vite started, then the first Chromium test failed before page execution.

- Follow-up hardening: separated pending Day confirmation state from the trip preview `activeDay`, added popover trigger `aria-controls`/`aria-expanded`, Escape/outside-click close, initial confirmation focus, open-card spacing for scroll-rail clipping risk, and removed stale `.ai-flow-panel`/`.ai-results-compact-head`/`.ai-day-picker`/`.ai-day-choice` CSS selectors.
- Follow-up validation after hardening: `cd frontend && npm run typecheck` passed; targeted `/ai-results` Vitest selection passed (5 selected tests); full `npm test -- --run` passed (143 tests); `npm run build` passed; scoped `git diff --check` passed.

## 2026-05-28 - /ai-results minimum 10 candidates and selected-only map pins

- [x] Completed ralplan consensus gate for `.omx/specs/deep-interview-ai-results-minimum-candidates-selected-pin.md`: PRD/test-spec written, Architect APPROVE, Critic APPROVE, durable handoff recorded at `.omx/plans/ralplan-handoff-ai-results-minimum-candidates-selected-pin.json`.
- [x] Created focused ultragoal plan with three execution stories in `.omx/ultragoal/goals.json`; archived the previous completed ultragoal artifacts under `.omx/ultragoal/archive/manual-*` before force-recreating the plan.
- [x] Added RED-first backend tests for balanced 10+ official candidates, sparse-category backfill, and service-level duplicate filtering before final recommendations.
- [x] Implemented target-aware additional candidate selection using official Kakao candidates only, with attraction/food/stay minimums when available and bounded overfetch for post-duplicate backfill.
- [x] Added RED-first frontend regression coverage for initial no-pin map state, selected-only map pin, switching selected pin, and no-`id`/no-`externalPlaceId` itemKey preservation.
- [x] Implemented selected-only `/ai-results` map rendering: no pins before user selection; one selected marker/pin after selection; preserved add-to-Day popover flow and duplicate blocking.
- [x] Updated `docs/mvp-api-contract.md` behavior text for best-effort 10+ official candidates and sparse-category backfill; no API DTO shape change was introduced.
- [x] Validation passed: `cd backend && .venv/bin/python -m pytest tests/test_itinerary_recommendations.py::test_additional_place_candidates_balances_minimum_ten_candidates tests/test_itinerary_recommendations.py::test_additional_place_candidates_backfills_when_stays_are_sparse tests/test_trip_db_service.py::test_list_recommendations_backfills_to_ten_after_duplicate_filtering -q` (3 passed after RED failure was observed).
- [x] Validation passed: `cd backend && .venv/bin/python -m pytest tests/test_itinerary_recommendations.py tests/test_trip_db_service.py -q` (70 passed).
- [x] Validation passed: `cd backend && .venv/bin/python -m pytest -q` (402 passed).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npx vitest run src/App.test.tsx -t "AI additional|AI candidate|already-added AI|selected AI candidate|AI results|criteria sheet|AI recommendation"` (6 selected tests passed).
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] `cd frontend && npm test -- --run ...`, `cd frontend && npm run test:e2e`, and `docker compose -f compose.yaml config` are blocked because the `docker` command is unavailable in this WSL distro.
- [ ] Direct full `cd frontend && npx vitest run src/App.test.tsx src/components/map/KakaoMapView.test.tsx` still has an unrelated existing create-trip expectation failure (`uses selected dates and shows generated itinerary times...` expects `휴식` selected while current UI has `맛집` selected); AI-results and map tests pass.
- [ ] Ultragoal CLI checkpoint for G001 could not be accepted because this Codex thread already has a completed aggregate goal with the same objective; `/goal clear` is required outside the shell before fresh active Codex-goal checkpoints can be reconciled in this thread.
- [x] Code-review follow-up fixed: duplicate filtering now runs before final balanced candidate slicing by passing the existing-trip duplicate predicate into `additional_place_candidates`; added regression for duplicate-heavy trips where later official candidates still allow 10 results.
- [x] Review blocker RED reproduced: `cd backend && .venv/bin/python -m pytest tests/test_trip_db_service.py::test_list_recommendations_filters_duplicates_before_final_ten_slice -q` failed with 9 returned items before the fix.
- [x] Review blocker GREEN: `cd backend && .venv/bin/python -m pytest tests/test_trip_db_service.py::test_list_recommendations_filters_duplicates_before_final_ten_slice tests/test_trip_db_service.py::test_list_recommendations_backfills_to_ten_after_duplicate_filtering tests/test_itinerary_recommendations.py::test_additional_place_candidates_balances_minimum_ten_candidates tests/test_itinerary_recommendations.py::test_additional_place_candidates_backfills_when_stays_are_sparse -q` passed (4 tests).
- [x] Post-review validation passed: `cd backend && .venv/bin/python -m pytest tests/test_itinerary_recommendations.py tests/test_trip_db_service.py -q` (71 passed).
- [x] Post-review validation passed: `cd backend && .venv/bin/python -m pytest -q` (403 passed).
- [x] Post-review validation passed: `cd frontend && npm run typecheck`.
- [x] Post-review validation passed: `cd frontend && npx vitest run src/App.test.tsx -t "AI additional|AI candidate|already-added AI|selected AI candidate|AI results|criteria sheet|AI recommendation"` (6 selected tests passed).
- [x] Post-review validation passed: `cd frontend && npm run build`.
- [x] Post-review validation passed: scoped `git diff --check`.
- [ ] Code-review medium note on `categoryName`/`phone` is classified as pre-existing/user-approved scope from the prior Kakao official metadata task, not newly introduced by this minimum-candidate/selected-pin task; no rollback was made.
- [x] Stop-hook reconciliation attempted: saved `get_goal` snapshot to `.omx/ultragoal/goal-snapshots/get-goal-20260528-g001.json` and attempted `omx ultragoal checkpoint --status complete` for `G001-backend-tdd-add-failing-tests-then-i` with quality gate JSON.
- [ ] OMX terminal checkpoint remains non-terminal: complete checkpoint was rejected because the Codex aggregate goal in this thread is already `complete`; recorded safe-recovery blocker with `omx ultragoal checkpoint --status blocked` to avoid mutating Codex goal state from shell.

## 2026-05-28 - /ai-results preview-hosted Day selector v3

- [x] Confirmed approved v3 browser wireframe: move Day selection into the current itinerary preview area, remove the ghost `취소` button, remove preview-head helper copy, and keep only a compact selector plus one primary CTA.
- [x] Added implementation plan: `docs/superpowers/plans/2026-05-28-ai-results-preview-day-selector-v3.md`.
- [x] Implemented frontend-only `/ai-results` changes in `AiResultsPage.tsx`: first recommendation auto-selects on entry, selected map summary is label-minimal, candidate add buttons open the preview-hosted Day selector, and duplicate candidates still hide add actions.
- [x] Updated `frontend/src/styles/app.css` for the compact preview selector and softened the active/add red tone.
- [x] Updated targeted App.test coverage for the preview-hosted selector, first selected map candidate, and add-failure flow.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|inline add button|selected AI candidate|adding a recommendation fails"` (4 selected tests passed).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: visual browser regression was reviewed via static wireframe; no live Playwright screenshot comparison was run for the updated implementation in this turn.

## 2026-05-28 - /ai-results inline Day selector and compact candidate copy

- [x] Completed deep-interview handoff from `.omx/specs/deep-interview-ai-results-inline-day-selector-compact-card-copy.md`.
- [x] Added implementation plan: `docs/superpowers/plans/2026-05-28-ai-results-inline-day-selector-compact-copy.md`.
- [x] RED observed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|inline add button|selected AI candidate|adding a recommendation fails"` failed because candidate cards still showed address/full category and the Day selector was still preview-hosted.
- [x] Implemented frontend-only `/ai-results` update: candidate add now renders a slim inline Day selector directly after the open candidate card; `TripPreview` remains the normal current itinerary preview.
- [x] Candidate cards now omit the address/location line and show only the leaf Kakao category, e.g. `음식점 > 카페 > 커피전문점` -> `커피전문점`; phone remains out of the compact card copy.
- [x] Map selected summary/detail still uses the full location/official place description.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|card-local Day selector|selected AI candidate|adding a recommendation fails"` (4 selected tests passed).
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for the updated inline selector in this turn.

## 2026-05-28 - /ai-results trip preview removal

- [x] Updated `/ai-results` targeted tests first to require `.ai-trip-preview` removal; RED observed because the current itinerary preview still rendered.
- [x] Removed the `TripPreview` render from `AiResultsPage.tsx`, so `section.ai-trip-preview` no longer appears on `/ai-results`.
- [x] Kept the card-local inline Day selector and compact candidate-copy behavior unchanged.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|card-local Day selector|adding a recommendation fails"` (3 selected tests passed).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.

## 2026-05-28 - /ai-results inline Day tab alignment

- [x] Adjusted `#ai-inline-day-selector .ai-slim-day-tabs` to use an equal-width responsive grid so Day buttons align according to the number of trip days.
- [x] Kept each Day button full-width within its grid cell and removed horizontal scroll inside the inline selector for normal day counts.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.

## 2026-05-28 - /ai-results map detail Kakao page link

- [x] Completed deep-interview handoff from `.omx/specs/deep-interview-ai-results-map-detail-kakao-page-link.md`.
- [x] RED observed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|Kakao map link"` failed because the selected map detail card did not expose a `카카오맵 보기` link.
- [x] Implemented frontend-only `/ai-results` change: the selected map detail summary renders a dedicated `카카오맵 보기` link using existing `Recommendation.placeUrl`, opening in a new tab with `target="_blank"` and `rel="noreferrer"`.
- [x] Link remains hidden when `placeUrl` is missing; no search fallback, whole-card click, API contract change, or backend change was introduced.
- [x] Adjusted the selected map detail summary layout so the Kakao link sits on the right side of the title row, keeping the overlay card slimmer.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|Kakao map link"` (2 selected tests passed).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for the final right-aligned button layout in this turn.

## 2026-05-28 - /ai-results recommendation tag moves into Day selector

- [x] RED observed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "card-local Day selector"` failed because the open candidate card still contained the `D2 추천` tag and the Day selector did not.
- [x] Updated `/ai-results` candidate rendering so the recommendation Day tag remains on the card only while the Day selector is closed.
- [x] Moved the same recommendation tag into the inline `Day 선택` header when the add selector is open, preserving duplicate/이미 추가됨 behavior.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "card-local Day selector"`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|card-local Day selector|Kakao map link"` (3 selected tests passed).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for this small layout adjustment.

## 2026-05-28 - /ai-results map detail responsive sizing

- [x] Updated the map detail overlay (`.ai-map-selected-summary`) to size from the map/card container instead of a fixed max-width, using responsive inset, gap, radius, and padding values.
- [x] Added inline-size containment to `.ai-map-card` and a narrow-container rule so the `카카오맵 보기` link drops below the title when the map card is too narrow.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|Kakao map link"` (2 selected tests passed).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser viewport sweep was run at 360/390/430/1024/1440 for this CSS-only adjustment.

## 2026-05-28 - /ai-results map detail large-screen responsive fix

- [x] Added explicit desktop (`min-width: 900px`) and wide (`min-width: 1180px`) overrides for `.ai-map-selected-summary` so the overlay uses the map card container on large screens as well.
- [x] Kept mobile/narrow container fallback behavior unchanged.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for the wide-screen layout in this turn.

## 2026-05-28 - /ai-results wide browser screenshot verification

- [x] Started Vite dev server with mocked API routes for `/ai-results?tripId=55` and ran Chromium/Playwright at 1440x900.
- [x] Saved screenshot artifact: `.omx/screenshots/ai-results-wide-1440.png`.
- [x] Measured layout in browser: viewport 1440x900, document scroll width 1425, map card width 390, selected summary width 366, left/right inset 12px, summary/map width ratio 0.938, console errors 0.
- [x] Browser assertion passed: selected summary stayed within map card bounds, exceeded 90% of map card width, and had no horizontal overflow.
- [ ] Note: the app's desktop service shell currently caps content width, so at 1440px browser width the map card itself measured 390px wide; this verification confirms overlay responsiveness inside the current shell rather than a full-bleed desktop redesign.

## 2026-05-28 - /ai-results recommendation day tags removed

- [x] Removed the `D1 추천`/`D2 추천` style recommendation Day tags from AI candidate card actions.
- [x] Removed the same recommendation Day tag from the inline `Day 선택` header that had been added in the previous adjustment.
- [x] Kept the `이미 추가됨` CTA text for duplicate/already-added candidates.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "card-local Day selector"`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|card-local Day selector|Kakao map link"` (3 selected tests passed).
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run after removing these tags.

## 2026-05-28 - /trips detail compact day tabs

- [x] Adjusted `/trips/:tripId` day selection tabs in `.prototype-trip-detail-screen .day-tabs` to be more compact: gap `10px -> 6px`, vertical padding `14/12px -> 6/8px`, and bottom spacing `16px -> 10px`.
- [x] Reduced `.prototype-trip-detail-screen .day-tab` visual size: padding `8px 16px -> 3px 9px`, font `13px -> 11px`, and min-height `24px` for a slim pill shape.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for `/trips/:tripId` day tabs in this turn.

## 2026-05-28 - /trips detail compact hero height

- [x] Reduced `.prototype-trip-detail-hero` height/min-height from `200px` to `100px` and trimmed bottom padding from `16px` to `10px`.
- [x] Reduced hero typography/icon scale to fit the shorter hero: title `22px -> 18px`, date text `12px -> 11px`, hero emoji `56px -> 36px`.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for the compact trip detail hero in this turn.

## 2026-05-28 - /trips detail back button overlap fix

- [x] Adjusted the absolute trip-detail top bar after shrinking the hero: moved it from `top: 20px` to `top: 8px` and reduced the back button from `38px` to `30px`.
- [x] Added left/top safe padding to `.prototype-trip-detail-hero` (`30px 16px 8px 52px`) so the hero copy does not overlap the back button.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for the overlap fix in this turn.

## 2026-05-28 - /trips detail back button smaller centered

- [x] Reduced the trip detail back button from `30px` to `15px` and positioned the absolute top bar at the hero's vertical center with `top: 50%; transform: translateY(-50%)`.
- [x] Adjusted hero left padding from `52px` to `36px` to match the smaller button while keeping text clear of the control.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for the centered 15px back button in this turn.

## 2026-05-28 - /trips detail back button hero-center correction

- [x] Corrected the trip detail back button vertical position from screen/section center to hero center by replacing `top: 50%` with `top: 50px` for the 100px hero.
- [x] Kept `transform: translateY(-50%)` so the 15px control is centered on the hero's vertical midpoint.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for this corrected hero-center position.

## 2026-05-28 - /trips detail back button text clearance

- [x] Increased `.prototype-trip-detail-hero` left padding from `36px` to `48px` so the hero text block starts to the right of the centered 15px back button.
- [x] Kept the back button vertically centered on the 100px hero with `top: 50px` and `translateY(-50%)`.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for this text-clearance adjustment.

## 2026-05-28 - /trips detail topbar option B implementation

- [x] Implemented selected wireframe B: the back button is positioned as a 28px control inside the hero's left-center rail (`left: 14px`, `top: 50px`).
- [x] Moved hero copy to a fixed safe rail to the right of the button with `padding-left: 54px`, preventing overlap while preserving the compact 100px hero.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run after implementing option B.

## 2026-05-28 - /trips detail back icon visual size reduction

- [x] Reduced the trip detail back link box from `28px` to `20px` and the nested chevron SVG from `20px` to `10px` for a visibly smaller control.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check`.
- [ ] Remaining risk: no live browser screenshot comparison was run for the smaller back icon.

- [x] 2026-05-28 trip detail back button measured-size fix: root cause was the shared `.top-bar` 48px grid track and shared `.icon-btn` 42px default still influencing the trip-detail top bar; scoped trip-detail top bar now uses a 20px flex rail with explicit min sizes/padding reset on the icon button.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `git diff --check -- frontend/src/styles/app.css CHECKLIST.md`.

## 2026-05-28 - PR merge validation for AI results and trip-detail polish

- [x] Prepared feature branch `feature/ai-results-map-trip-detail-polish-20260528` from current `develop` before PR creation because the working tree changes were initially accumulated on `develop`.
- [x] Updated backend-mode Playwright e2e to use the current `/ai-results` inline Day selector (`추가` button -> inline dialog -> `Day N에 추가`) instead of the removed popover day button expectation.
- [x] Validation passed: `cd backend && .venv/bin/python -m pytest -q` (403 passed).
- [x] Validation passed: `cd frontend && PATH="/tmp/travel-hunter-docker-wrapper:$PATH" PYTHON="../backend/.venv/bin/python" VITE_KAKAO_MAP_JS_KEY=real-ci-key npm test -- --run` (144 passed).
- [x] Validation passed: `cd frontend && npm run build`.
- [x] Validation passed: `cd backend && .venv/bin/alembic upgrade head --sql` generated `/tmp/travel-hunter-alembic.sql`.
- [x] Validation passed: `python3 -m json.tool .agent/evals/api-contract-golden.json`.
- [x] Validation passed: `PATH="/tmp/travel-hunter-docker-wrapper:$PATH" docker compose -f compose.yaml config --quiet`.
- [x] Validation passed: `cd frontend && PATH="/tmp/travel-hunter-docker-wrapper:$PATH" PYTHON="../backend/.venv/bin/python" VITE_KAKAO_MAP_JS_KEY=real-ci-key LD_LIBRARY_PATH="/tmp/pw-libs/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}" npm run test:e2e` (9 passed after updating the e2e selector to the current inline Day selector UX).
