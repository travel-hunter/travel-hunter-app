# Trip Confirmation Lock Design

## Goal

Make trip confirmation meaningful by turning confirmed trip details into a read-only state and allowing owners/editors to cancel confirmation from the trip detail page.

## Current Behavior

- `/trips` can move a draft trip to `confirmed` through `PATCH /api/trips/{tripId}/status`.
- The backend already accepts both `draft` and `confirmed` because `UpdateTripStatusRequest.status` is the shared trip status enum.
- `/trips/{tripId}` detail does not treat `confirmed` differently from `draft`, so places and linked policies can still be edited.
- There is no detail-page action to move a confirmed trip back to `draft`.

## Status Rules

- `draft`: owner/editor can edit places, move places, delete places, add places, and remove linked policies.
- `confirmed`: owner/editor can view the trip, linked policies, recommendations, invite link, and map/list views, but cannot edit places or remove linked policies until confirmation is canceled.
- `viewer`: always read-only. Viewer does not see confirm or cancel-confirmation actions.

## Frontend UX

- Keep the existing `/trips` list confirmation flow for draft trips.
- Add a status badge to `/trips/{tripId}` detail: `작성 중` for draft, `확정됨` for confirmed.
- When a trip is confirmed and the current user is owner/editor, show a `확정취소` button in the detail hero/status area.
- On cancel confirmation, call `appDataApi.updateTripStatus(trip.id, { status: "draft" })`, replace local `trip` state with the response, and show a short success toast.
- On failure, keep the current status and show a clear error toast.
- For confirmed trips, hide or disable edit controls: add place, edit/delete place, drag handles, keyboard movement, day drop targets, and linked-policy remove buttons.
- Show an inline read-only notice for confirmed trips explaining that edits require canceling confirmation first.

## API And Data Flow

No API shape change is required. The existing `PATCH /api/trips/{tripId}/status` endpoint is reused with `{ "status": "draft" }`.

## Tests

- Add frontend tests for confirmed owner/editor detail:
  - `확정취소` is visible.
  - edit controls are hidden.
  - clicking cancel calls `updateTripStatus(id, { status: "draft" })`.
  - edit controls return after the response updates status to `draft`.
- Add a viewer test proving `확정취소` is hidden.
- Extend backend-mode E2E enough to verify the detail page exposes the confirmed lock state and the cancel action can restore draft editing.

## Non-Goals

- Do not add a new backend endpoint.
- Do not add new trip status values.
- Do not block navigation, policy viewing, recommendation viewing, invite viewing, or list/map switching for confirmed trips.
