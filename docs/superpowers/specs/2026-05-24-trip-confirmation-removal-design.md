# Trip Confirmation Removal Design

## Decision

Use option B: remove the trip confirmation feature from the frontend while keeping linked policy cards and policy-to-trip linking intact.

## Scope

Remove user-facing confirmation controls from trip detail:

- No `확정하기` button.
- No `확정취소` button.
- No trip confirmation status panel on the detail page.
- No frontend call to `appDataApi.updateTripStatus` from trip detail.

Keep existing trip editing available to owner/editor users regardless of whether persisted trip data says `draft` or `confirmed`:

- Place add, edit, delete.
- Place reorder and move between days.
- Linked policy delete.
- Linked policy section and policy detail links.

Do not remove backend status storage or the `PATCH /api/trips/{tripId}/status` endpoint in this change. Existing rows may still contain `confirmed`, but the frontend will no longer use that value to lock editing or invite users to confirm/cancel a trip.

## UI Behavior

Trip detail should move directly from the hero area to people, linked policies, recommendations, and day content. If the user can manage the trip (`owner` or `editor`), edit controls remain visible even for `confirmed` trips returned by the backend.

Trip list can continue to show lightweight status-derived visual tags for now, but it must not expose confirmation actions. A later cleanup can simplify list status labels after product copy is finalized.

## Data Flow

No API shape changes are required. Frontend data access remains through `AppDataApi`.

The `Trip.status` field remains in frontend types because backend responses still include it. The frontend detail page simply stops using it as an edit-lock condition.

## Tests

Update frontend tests to assert:

- Trip detail does not render confirmation controls.
- A `confirmed` owner/editor trip still exposes editing controls.
- A `confirmed` owner/editor trip can still remove a linked policy.
- Viewer trips remain read-only because role-based permission still applies.

## Risks

Existing tests and docs describe confirmation lock behavior and must be updated. Backend status functionality remains available but unused from the current frontend; this is intentional to avoid a larger contract and migration change.
