# PRD: Kakao Map First Pass

## Requirements Summary
Implement the first bounded pass from `.omx/specs/deep-interview-travel-hunter-kakao-map.md` for Travel Hunter.

Goal: make the existing Kakao map surfaces on `/ai-results?tripId=...` and `/trips/:tripId?view=map` reliably show a Kakao-backed map when prerequisites are present, and verify the backend Kakao Local data-generation path preserves coordinates from search candidates through trip place storage and API responses, while preserving graceful fallback and existing recommendation include/duplicate-exclude behavior.

## Brownfield Facts
- `frontend/src/components/map/KakaoMapView.tsx` already loads Kakao Maps through `frontend/src/lib/kakaoMap.ts` and renders SDK map markers when `VITE_KAKAO_MAP_JS_KEY` and valid coordinates exist.
- `frontend/src/pages/itinerary/AiResultsPage.tsx` passes recommendation latitude/longitude into `KakaoMapView` and adds recommendations to a trip through `appDataApi.addTripPlace`.
- `frontend/src/pages/itinerary/ItineraryDetailPage.tsx` passes itinerary place latitude/longitude into `KakaoMapView` for map view.
- `backend/app/services/trips.py` automatically excludes duplicate additional recommendation candidates by provider+external id, external id, or normalized title.
- `backend/app/services/kakao_local.py` parses Kakao Local `x`/`y` into longitude/latitude, and `backend/app/services/trips.py` already attempts to persist generated place coordinates when Kakao Local candidates are used.
- `.env.example` currently documents API/dev password variables but not the frontend Kakao Maps JS key.

## RALPLAN-DR Summary

### Principles
1. Preserve existing data boundaries: frontend pages continue using `AppDataApi`; no seed/mock coupling.
2. Keep the pass small and reversible before API/schema changes.
3. Never commit secrets; document env names only.
4. Keep real-map success and fallback behavior both testable.
5. Preserve recommendation inclusion and automatic duplicate exclusion semantics.

### Decision Drivers
1. User wants both target screens to show Kakao Map API maps.
2. Existing implementation already has map wiring, so likely frontend failure modes are visibility/config/test hardening rather than a full new map feature.
3. User explicitly expanded scope to include backend coordinate generation/storage/response verification.
4. The approved scope excludes explicit user-driven recommendation exclusion and catalog coordinate enrichment.

### Viable Options
#### Option A ? Frontend-first hardening
Pros: smallest change; addresses likely map canvas visibility/config/doc/test gaps; preserves API contract. Cons: does not catch missing backend coordinates.

#### Option B ? Bounded frontend plus backend coordinate propagation (chosen)
Pros: validates the full map success path from Kakao Local candidate coordinates to frontend SDK rendering. Cons: broader than a component-only fix and requires backend tests.

#### Option C ? Catalog geocoding/static coordinate enrichment
Pros: could make fallback schedules map-ready. Cons: out of scope for this pass; requires a separate data quality/geocoding decision.

#### Option D ? New explicit recommendation exclusion feature
Pros: answers a potential product gap. Cons: out of first-pass scope; requires UX/API/storage decisions.

## ADR
### Decision
Use Option B: a bounded combined pass covering frontend map hardening and backend Kakao Local coordinate propagation verification. Keep catalog fallback coordinate-less for this pass and preserve graceful frontend fallback.

### Drivers
- Existing map component and page wiring are already present.
- First pass must stay small and reversible.
- User wants backend data generation included when maps fail due to missing coordinates.
- User approved allowing catalog fallback to remain coordinate-less.

### Alternatives considered
- Frontend-only hardening: rejected as incomplete after scope clarification.
- Catalog geocoding/static coordinate enrichment: deferred to avoid uncontrolled scope growth.
- Explicit recommendation exclude/hide: deferred as a separate product/API feature.
- Full UI redesign: rejected by first-pass scope.

### Consequences
- The app still falls back when key/SDK/coordinates are unavailable.
- Kakao Local disabled/failure or insufficient candidates may still use catalog fallback without coordinates in this pass.
- Production map display may still require Kakao developer-console domain configuration outside repo changes.
- Future follow-up can add catalog coordinate enrichment or explicit recommendation exclusion after separate approval.

## In Scope
- Fix/strengthen `KakaoMapView` labels and visible canvas/container behavior.
- Add safe `VITE_KAKAO_MAP_JS_KEY=` documentation to `frontend/.env.example`.
- Add focused tests for SDK map initialization and fallback behavior.
- Add/update backend tests proving Kakao Local candidate latitude/longitude persist into generated trip places and serialize in the trip API response.
- Preserve existing AI recommendation add-to-trip metadata behavior.
- Preserve automatic duplicate recommendation exclusion behavior.

## Out of Scope
- Explicit ?exclude/hide this recommendation? UX/API/storage.
- Catalog fallback coordinate guarantee, runtime catalog geocoding, or static catalog coordinate enrichment.
- DB migrations or backend contract changes unless a blocking bug is discovered.
- Kakao developer-console/production domain changes.
- Large visual redesign.

## Implementation Steps
1. Update `frontend/src/components/map/KakaoMapView.tsx` to remove mojibake labels and keep marker buttons accessible.
2. Update `frontend/src/styles/app.css` so `.kakao-map-view` and its target containers have stable visible min-height/overflow behavior for SDK canvas and overlays.
3. Update `frontend/.env.example` with `VITE_KAKAO_MAP_JS_KEY=` and no secret value.
4. Add `frontend/src/components/map/KakaoMapView.test.tsx` to mock `window.kakao.maps`, assert map/markers initialize with key+coordinates, and assert fallback when coordinates are missing.
5. Add/update backend service tests proving Kakao Local candidate latitude/longitude persist into generated trip places and serialize in the trip API response, without requiring catalog fallback coordinates.
6. Run targeted frontend/backend tests, then typecheck/build if feasible.

## Acceptance Criteria
- `KakaoMapView` initializes Kakao `Map` and `Marker` instances when `VITE_KAKAO_MAP_JS_KEY`, `window.kakao.maps`, and valid marker coordinates exist.
- `KakaoMapView` renders fallback and does not initialize SDK map when coordinates are missing.
- Target page tests for `/ai-results?tripId=...` and `/trips/:id?view=map` remain passing.
- `frontend/.env.example` documents `VITE_KAKAO_MAP_JS_KEY=` safely.
- Kakao Local-enabled trip generation persists and returns latitude/longitude through existing fields.
- Kakao Local disabled/failure/catalog fallback may remain coordinate-less and should trigger graceful frontend fallback.
- No backend API shape or DB schema changes are made in this pass unless a blocking defect is discovered and contract files are updated together.
- Existing recommendation add-to-trip metadata test remains passing.
- Existing duplicate recommendation exclusion tests/behavior remain passing.

## Risks and Mitigations
- Risk: Vitest cannot mutate Vite env dynamically. Mitigation: use `vi.stubEnv` or isolate the map loader in a direct component test; if unsupported, test fallback and document gap.
- Risk: Existing global `window.kakao` promise cache leaks between tests. Mitigation: cleanup `window.kakao` and SDK script after tests; avoid script path for SDK success by preinstalling mock.
- Risk: Real production SDK still fails due Kakao app domain config. Mitigation: document that repo changes cannot alter Kakao console settings.
- Risk: Kakao Local disabled or sparse results still yield coordinate-less catalog fallback. Mitigation: treat catalog coordinate enrichment as a separate follow-up.

## Available-Agent-Types Roster
- executor: implement bounded frontend/backend patch.
- test-engineer/verifier: validate tests/typecheck/build.
- code-reviewer: review diff before completion.
- architect/critic: already used for this consensus gate.

## Follow-up Staffing Guidance
- Default `$ultragoal`: one executor lane is likely sufficient; `$team` is optional if frontend/backend/e2e work is split.
- `$team`: consider only if follow-up expands into backend coordinate repair plus frontend UI plus e2e validation.
- `$ralph`: legacy fallback only if explicitly requested.

## Goal-Mode Follow-up Suggestions
- Use `$ultragoal` as the default durable execution wrapper for this PRD.
- `$performance-goal` and `$autoresearch-goal` are not applicable.
