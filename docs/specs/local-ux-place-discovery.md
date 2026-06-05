# Local UX Spec: Place Detail And Search

## Goal

Complete the local itinerary place experience so users can inspect places, search or discover alternatives, and add useful candidates to an itinerary with clear fallback behavior.

## User Experience Boundary

This spec covers:

- Trip detail place list and map mode
- Map bottom-sheet place detail action
- Place search/discovery UX
- Kakao Local candidate quality
- Built-in catalog fallback coverage
- `/ai-results` additional candidates and fallback behavior
- Recommendation basis messaging

Deployment, public map domain setup, CI/CD, and staging smoke are deferred.

## Current State

Implemented or partially implemented:

- Trip detail supports list/map views and place CRUD/move.
- Kakao Maps rendering is attempted when key, SDK, and coordinates are available.
- Fallback map/search UI exists when Kakao rendering cannot be used.
- Map bottom-sheet "detail view" opens a local detail dialog with day context, time, category, address, memo, coordinates, and a Kakao Maps link.
- The itinerary add-place sheet loads recommendation candidates through `AppDataApi.listRecommendations`, filters them locally, and can add a selected candidate while preserving address, coordinates, category, Kakao URL, provider, and external place id fields.
- `/ai-results` lists additional recommendation candidates and supports adding a candidate to a selected day.
- Kakao Local is used when enabled; built-in catalog fallback keeps local trip creation from producing an empty experience.

Known gaps:

- Candidate quality depends on Kakao Local env, search results, and travel area term matching.
- Catalog fallback can be sparse for some regions.
- `/ai-results` can fall back to recommendation descriptions saved at trip creation rather than fresh candidates.
- The recommendation basis UI describes product direction, but not every factor is implemented as quantitative ranking.

## Missing UX To Complete Locally

1. Kakao Local candidate fetching should be stable enough for local smoke with configured env.
2. Catalog fallback should cover enough regions to avoid sparse or empty trip days in local demos.
3. `/ai-results` should distinguish fresh additional candidates from fallback recommendation summaries.
4. Recommendation basis copy should match the actual local ranking inputs.
5. Route-time optimization and ratings/reviews should remain explicitly future scope unless implemented.

## Current Validation Evidence

- 2026-06-05 frontend typecheck: `cd frontend && npm run typecheck` passed.
- 2026-06-05 map detail unit coverage: `cd frontend && npm test -- --run src/App.test.tsx -t "opens an inspectable place detail dialog"` passed with 1 selected test.
- 2026-06-05 adjacent map coverage: `cd frontend && npm test -- --run src/App.test.tsx -t "toggles itinerary detail between list and map views|opens an inspectable place detail dialog|uses stored Kakao place URL"` passed with 3 selected tests.
- 2026-06-05 frontend baseline: `cd frontend && npm test` passed with 8 files and 155 tests after adding Place Search/Add coverage and stabilizing the MyPage profile editor test to wait for loaded profile option buttons.
- 2026-06-05 place search/add RED: `cd frontend && npm test -- --run src/App.test.tsx -t "searches recommendation candidates from the add-place sheet"` failed because the add-place sheet did not call `listRecommendations`.
- 2026-06-05 place search/add GREEN: `cd frontend && npm test -- --run src/App.test.tsx -t "searches recommendation candidates from the add-place sheet"` passed with 1 selected test.
- 2026-06-05 adjacent place edit coverage: `cd frontend && npm test -- --run src/App.test.tsx -t "adds, edits, and deletes places from the itinerary detail|searches recommendation candidates from the add-place sheet|restores and clears add-place drafts"` passed with 3 selected tests.

## Local Completion Criteria

- Clicking map bottom-sheet place detail opens an inspectable local detail UI. Completed locally on 2026-06-05.
- A user can search for a place and add it to a trip day. Completed locally on 2026-06-05 with recommendation candidates through the existing AppDataApi boundary.
- Local runtime with Kakao Local enabled returns usable candidates for representative regions.
- Local runtime without Kakao Local still produces non-empty, clearly labeled fallback candidates for supported regions.
- `/ai-results` communicates when candidates are fallback-derived.
- Recommendation explanation does not overclaim unimplemented route-time, rating, or review scoring.

## Relevant Files And APIs

Frontend:

- `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`
- `frontend/src/pages/itinerary/AiResultsPage.tsx`
- `frontend/src/components/map/KakaoMapView.tsx`
- `frontend/src/lib/kakaoMap.ts`
- `frontend/src/api/appDataApi.ts`
- `frontend/src/api/backendApi.ts`
- `frontend/src/api/types.ts`

Backend:

- `backend/app/api/routes/trips.py`
- `backend/app/services/trips.py`
- `backend/app/services/itinerary_recommendations.py`
- `backend/app/services/kakao_local.py`
- `backend/app/data/itinerary_catalog.py`

Contracts and references:

- `docs/mvp-api-contract.md`
- `docs/screen-feature-status-screens.md`
- `docs/screen-feature-status-logic.md`

## Non-Goals

- Do not implement public deployment or CI/CD in this spec.
- Do not claim AI, ratings/reviews, or route-time optimization are complete until corresponding services and tests exist.
- Do not add new dependencies without a separate implementation plan.
