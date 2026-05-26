# /trips/new Travel Area UX Continuity Implementation Plan

## Status

- 상태: 완료
- 완료일: 2026-05-26
- 결과: `/trips/new` travel-area URL/state/draft 동기화 보강 완료

**Goal:** Keep `/trips/new` travel-area selection consistent across URL query, draft restore, direct URL entry, and region changes.

**Architecture:** Keep the frontend behind `AppDataApi`. Treat URL query as the shareable entry state, draft as the local recovery state, and component state as the current interaction state. Do not change backend API contracts in this task.

**Tech Stack:** React, React Router, Vite, Vitest, Testing Library, `AppDataApi`.

---

## Task 1: Stabilize travel-area URL/state synchronization

**Files:**

- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- Modify: `frontend/src/App.test.tsx`
- Create/Update: `docs/superpowers/specs/2026-05-26-trips-new-travel-area-ux-continuity-design.md`
- Record: `CHECKLIST.md`

- [x] **Step 1: Add tests for state continuity**

Added coverage for travel-area draft restore after remount and stale `travelAreaId` clearing when the user switches from a direct travel-area URL back to a normal region.

- [x] **Step 2: Sync query state when selecting a region**

Selecting a region button now sets `region=<selected region>` and removes stale `travelAreaId`.

- [x] **Step 3: Sync query state when selecting a travel-area**

Selecting a travel-area card now sets `region=<sido>` and `travelAreaId=<travelAreaId>` while preserving `policySlug`.

- [x] **Step 4: Keep broad region visually active**

When `selectedTravelArea` exists, the active broad region button is derived from `selectedTravelArea.sido`, while trip title and payload continue to use the travel-area display name.

- [x] **Step 5: Record validation status**

Recorded validation in `CHECKLIST.md`.

## Validation Results

- [x] `cd frontend; npm run typecheck` passed.
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t travel` passed with 6 passed and 101 skipped.
- [x] `docker compose -f compose.yaml up -d --build` passed.

## Remaining Risks

- Browser smoke was not part of the final validation request.
- If needed, manually verify `/trips/new?region=강원`, `/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang`, and normal-region switching in the browser.