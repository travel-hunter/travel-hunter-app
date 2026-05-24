# Trip Confirmation Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make confirmed trip details read-only and add a detail-page confirmation-cancel action that restores draft editing.

**Architecture:** Reuse the existing `PATCH /api/trips/{tripId}/status` API and keep all behavior behind the frontend `AppDataApi` boundary. The trip detail page will derive separate booleans for role edit capability and status edit availability so viewer read-only and confirmed read-only remain distinct.

**Tech Stack:** React, TypeScript, React Router, Vitest/Testing Library, Playwright backend-mode E2E, existing FastAPI trip status endpoint.

---

### Task 1: Frontend Unit Coverage

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add a confirmed detail test**

Add a test that mocks `appDataApi.getTrip()` with a `confirmed` owner/editor trip and asserts that `확정취소` is visible while place edit controls, add-place controls, and linked-policy remove controls are not visible.

- [ ] **Step 2: Add a cancel-confirmation test**

Add a test that clicks `확정취소`, expects `appDataApi.updateTripStatus(trip.id, { status: "draft" })`, and verifies draft edit controls return after local state updates.

- [ ] **Step 3: Add a viewer guard test**

Add a test that a confirmed viewer trip does not show `확정취소`.

- [ ] **Step 4: Run the focused red tests**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "confirmed trip"`

Expected before implementation: at least one new test fails because the detail page has no confirmation-cancel control and confirmed trips are still editable.

### Task 2: Trip Detail Lock Implementation

**Files:**
- Modify: `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`
- Modify: `frontend/src/styles/app.css`

- [ ] **Step 1: Split edit capability booleans**

Derive `canManageTripStatus`, `isTripConfirmed`, and `canEditTrip` so owner/editor can manage status, but only draft owner/editor can edit trip content.

- [ ] **Step 2: Add cancel-confirmation handler**

Call `appDataApi.updateTripStatus(trip.id, { status: "draft" })`, update `trip`, and show success/error feedback.

- [ ] **Step 3: Render status controls**

Add a detail status panel with a status badge, confirmed read-only explanation, and `확정취소` button for confirmed owner/editor users.

- [ ] **Step 4: Lock confirmed edit controls**

Use the new `canEditTrip` boolean for add/edit/delete/move controls, day drop targets, linked-policy remove buttons, and existing edit guard branches.

- [ ] **Step 5: Style the status panel**

Add compact responsive CSS that fits the existing detail page layout and does not overlap bottom tabs.

### Task 3: E2E And Documentation

**Files:**
- Modify: `frontend/e2e-backend/backend-mode.spec.ts`
- Modify: `docs/current-work-spec.md`
- Modify: `docs/mvp-api-contract.md`
- Modify: `.agent/evals/api-contract-golden.json`
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Extend E2E**

Add a backend-mode check that a confirmed detail page shows the locked state, then canceling confirmation restores an edit control.

- [ ] **Step 2: Update docs and evals if needed**

Document that `PATCH /api/trips/{tripId}/status` supports both `confirmed` and `draft` and that confirmed details are frontend read-only until canceled. No API field changes are expected.

- [ ] **Step 3: Run verification**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx --reporter=dot
npm run typecheck
npm run test:e2e

cd ../backend
python -m pytest -q

cd ..
python -m json.tool .agent/evals/api-contract-golden.json
docker compose -f compose.yaml config --quiet
git diff --check
```

Expected: all commands pass, with only known line-ending warnings from `git diff --check`.

### Self-Review

- Spec coverage: status rules, cancel action, lock controls, tests, and docs are covered.
- Placeholder scan: no placeholders remain.
- Type consistency: uses existing `Trip.status`, `TripStatusUpdateRequest`, and `appDataApi.updateTripStatus`.
