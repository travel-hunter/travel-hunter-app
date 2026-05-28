# Test Spec: Kakao Map First Pass

## Scope Under Test
Frontend Kakao map component behavior, backend Kakao Local coordinate propagation, and preservation of target page recommendation/map flows.

## Unit/Component Tests
1. `KakaoMapView` with mocked `window.kakao.maps` and `VITE_KAKAO_MAP_JS_KEY`:
   - renders no fallback content;
   - constructs one `Map`;
   - constructs a `Marker` for each valid coordinate marker;
   - marker overlay button click calls `onSelectMarker(id)`.
2. `KakaoMapView` with no valid coordinates:
   - renders fallback content;
   - does not construct `Map`.

## Backend Service/API Tests
1. Trip creation with a mocked Kakao Local/external provider returning valid latitude/longitude:
   - stores coordinates on generated trip places;
   - returns those coordinates in the trip API response using existing `latitude` / `longitude` fields;
   - preserves source provider, external id, category, address, and place URL metadata when present.
2. Kakao Local disabled/failure or insufficient candidates:
   - may fall back to catalog-generated places without coordinates;
   - does not fail trip creation solely because coordinates are unavailable;
   - keeps frontend fallback behavior valid.
3. Additional recommendation candidate path:
   - preserves candidate latitude/longitude and metadata in recommendation items;
   - keeps duplicate candidate exclusion by provider+external id, external id, and normalized title unchanged.

## Existing Regression Tests To Keep Passing
- `frontend/src/App.test.tsx` map view tests around itinerary detail map view.
- `frontend/src/App.test.tsx` AI recommendation candidate map layout test.
- `frontend/src/App.test.tsx` recommendation add-to-trip metadata test.

## Verification Commands
From `frontend/`:
1. `cmd /c npx vitest run src/components/map/KakaoMapView.test.tsx src/App.test.tsx --runInBand` or nearest supported targeted equivalent.
2. `cmd /c npm run typecheck`.
3. `cmd /c npm run build` if typecheck and tests pass or if build is needed to prove Vite env/types.

From `backend/`:
4. `python -m pytest tests/test_trip_db_service.py tests/test_itinerary_recommendations.py tests/test_kakao_local.py` or the nearest targeted backend equivalent.
5. `alembic upgrade head --sql` only if implementation changes schema/migration assumptions.

## Manual/Runtime QA Notes
- If a local dev server is available, visit `/ai-results?tripId=55` and `/trips/55?view=map` with a configured browser key and coordinate-bearing data.
- If the map still falls back with a key and coordinates, inspect browser console for Kakao domain/key authorization errors.

## Non-goal Tests
- Do not add tests for explicit user-driven recommendation exclusion in this pass; the feature is out of scope.
- Do not require catalog fallback coordinates in this pass.
- Do not add migration/API contract tests unless implementation discovers a backend schema/API defect.
