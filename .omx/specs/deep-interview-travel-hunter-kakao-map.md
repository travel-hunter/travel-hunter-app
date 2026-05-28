# Deep Interview Spec: Travel Hunter Kakao Map Expanded Pass

## Metadata
- Profile: standard
- Context type: brownfield
- Final ambiguity: 0.17
- Threshold: 0.20
- Status: execution-ready for planning/execution handoff
- Context snapshot: `.omx/context/resume-kakao-map-first-pass-20260528T020430Z.md`
- Prior global spec: `C:/Users/HP/.omx/specs/deep-interview-travel-hunter-kakao-map.md`
- Prior plan artifacts: `.omx/plans/prd-kakao-map-first-pass.md`, `.omx/plans/test-spec-kakao-map-first-pass.md`

## Transcript Summary
1. The interrupted work was identified as Kakao Map First Pass for `/ai-results?tripId=...` and `/trips/:tripId?view=map`.
2. Existing PRD/test-spec artifacts were found, but implementation gaps remain: mojibake labels in `KakaoMapView`, missing `KakaoMapView.test.tsx`, and missing `VITE_KAKAO_MAP_JS_KEY=` documentation.
3. User asked whether further refinement would lower ambiguity.
4. The main unresolved scope was whether backend coordinate/data generation should be included when maps fail because coordinates are absent.
5. User clarified the goal should include backend data generation flow.
6. Code inspection found Kakao Local client/provider already exists and `create_trip()` persists generated place latitude/longitude when Kakao Local candidates are used.
7. User approved the recommended boundary: guarantee Kakao Local-enabled coordinate generation/storage/response path; allow catalog fallback to remain coordinate-less with graceful frontend fallback.

## Clarity Breakdown
| Dimension | Score | Notes |
| --- | ---: | --- |
| Intent | 0.93 | Real Kakao maps should appear when the product has Kakao-backed place data, not silently fail due to missing coordinate propagation. |
| Outcome | 0.91 | Both target map surfaces render SDK maps when key + SDK + coordinates exist; backend Kakao Local generation stores and returns coordinates. |
| Scope | 0.90 | Includes frontend rendering hardening plus backend Kakao Local coordinate generation/storage/DTO verification. Catalog geocoding is out of scope. |
| Constraints | 0.86 | Preserve API shapes if possible, no secrets, no runtime mock mode, no large redesign, no Kakao console/domain changes. |
| Success Criteria | 0.88 | Unit/service tests prove SDK map init/fallback and backend coordinate persistence/response in Kakao Local path. |
| Context | 0.95 | Existing Kakao Local, trip generation, schema, and frontend map code paths inspected. |

## Intent
Make Travel Hunter's trip and AI recommendation map views reliably show real Kakao maps when Kakao-backed coordinates are available, and make coordinate absence/fallback behavior explicit and tested.

## Desired Outcome
- `/trips/:tripId?view=map` shows a Kakao SDK map for itinerary places generated from Kakao Local with valid `latitude` / `longitude`.
- `/ai-results?tripId=...` shows a Kakao SDK map for recommendation candidates with valid `latitude` / `longitude`.
- Backend trip creation/recommendation flows preserve Kakao Local coordinates from candidate search through DB write and API response.
- If Kakao Local is disabled, fails, or returns insufficient candidates and catalog fallback is used, coordinate absence is allowed and frontend fallback remains graceful.

## In Scope
- Frontend `KakaoMapView` label/mojibake cleanup, container/canvas visibility hardening, SDK map initialization behavior, and fallback behavior.
- Safe frontend env documentation for `VITE_KAKAO_MAP_JS_KEY=`.
- Backend tests/repairs for Kakao Local candidate `latitude` / `longitude` propagation into `TripPlace` and trip API responses.
- Recommendation candidate coordinate preservation for add-to-trip/map display flows.
- Targeted tests around frontend SDK rendering/fallback and backend Kakao Local coordinate persistence.

## Out of Scope / Non-goals
- Catalog fallback coordinate guarantee or bulk static catalog coordinate enrichment.
- Runtime geocoding for catalog fallback in this pass.
- New DB schema unless a blocking missing-column defect is discovered.
- Public API shape changes unless a blocking DTO defect is discovered; existing `latitude` / `longitude` fields should be reused.
- Explicit “hide/exclude this recommendation forever” UX/API/storage.
- Kakao developer-console domain/key configuration.
- Large UI redesign or production deployment.
- Committing secrets.

## Decision Boundaries
OMX may decide and implement without further confirmation:
- Small frontend map component/style/test fixes.
- Backend service/repository fixes that preserve existing API shape and DB schema.
- Tests proving Kakao Local candidate coordinates persist and serialize.
- Safe env example/documentation updates without real keys.
- Fallback diagnostic copy/accessibility fixes.

Ask before:
- Adding catalog geocoding or static coordinate enrichment as a broader data project.
- Adding/changing DB schema or public API fields.
- Introducing new dependencies.
- Adding explicit recommendation exclusion feature.
- Changing Kakao console/domain settings or deployment secrets.
- Large UI redesign.

## Constraints
- API DTO fields stay `camelCase`; DB/SQL fields stay `snake_case`.
- Frontend pages/components stay behind `AppDataApi`.
- Backend routes remain thin; behavior in services, DB access in repositories.
- Runtime mock mode must not be reintroduced.
- Secrets are never committed; env examples document names only.

## Testable Acceptance Criteria
1. With mocked Kakao SDK, `KakaoMapView` initializes `Map` and `Marker` instances for valid coordinates and configured `VITE_KAKAO_MAP_JS_KEY`.
2. `KakaoMapView` renders fallback and does not initialize SDK map when valid coordinates are absent.
3. `frontend/.env.example` documents `VITE_KAKAO_MAP_JS_KEY=` with no secret value.
4. Backend trip creation with a mocked Kakao Local provider that returns coordinates persists those coordinates on generated `TripPlace` rows.
5. Trip API response includes the persisted `latitude` / `longitude` for Kakao Local generated places using existing response fields.
6. AI recommendation candidate/add-to-trip flow preserves `latitude` / `longitude` and place metadata through existing API boundary.
7. Kakao Local disabled/failure/catalog fallback remains allowed to produce coordinate-less places, and frontend graceful fallback remains tested.
8. Existing duplicate recommendation exclusion behavior remains unchanged.
9. No API contract or DB schema change is made unless implementation discovers a blocking defect and updates all required contract/test/eval files.

## Brownfield Evidence
- `frontend/src/components/map/KakaoMapView.tsx`: existing SDK-backed map component; currently has mojibake labels.
- `frontend/src/lib/kakaoMap.ts`: dynamic Kakao Maps JS SDK loader using `VITE_KAKAO_MAP_JS_KEY`.
- `frontend/src/pages/itinerary/AiResultsPage.tsx`: recommendation markers pass coordinates into `KakaoMapView`.
- `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`: itinerary markers pass coordinates into `KakaoMapView`.
- `backend/app/services/kakao_local.py`: parses Kakao Local `x`/`y` into longitude/latitude.
- `backend/app/services/trips.py`: builds Kakao Local provider, generates course, stores generated place coordinates, and serializes trip places.
- `backend/app/services/itinerary_recommendations.py`: carries external candidate coordinates into generated places/recommendations.
- `backend/app/schemas/trip.py`: existing trip/recommendation DTOs already include `latitude` and `longitude`.

## Pressure Pass Findings
Initial assumption: the problem is only frontend map rendering/configuration.
Refined finding: frontend map visibility is necessary but insufficient; the backend Kakao Local data path must also be verified so generated trip places and AI candidates actually contain coordinates. The approved boundary keeps catalog fallback coordinate-less to avoid expanding this pass into geocoding/static data enrichment.

## Recommended Handoff
- Recommended: `$ralplan` refresh or direct `$ultragoal`/execution using this spec because scope now crosses frontend and backend tests.
- If planning artifacts are reused, update `.omx/plans/prd-kakao-map-first-pass.md` and `.omx/plans/test-spec-kakao-map-first-pass.md` to include backend Kakao Local coordinate persistence criteria before implementation.
