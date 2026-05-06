# Backend Endpoint Smoke Eval

## Source

- API contract: `docs/mvp-api-contract.md`
- Current tests: backend route/service tests under `backend/tests`.

## Endpoint Matrix

| Endpoint | Expected | Key assertions | Priority |
|---|---:|---|---|
| `GET /health` | 200 | service health response is available | P1 |
| `GET /api/health` | 200 | `status`, `service`, `environment`, `database` | P0 |
| `POST /api/auth/login` | 200 | `accessToken`, `user.name`, `user.preferredRegions` | P0 |
| `POST /api/auth/signup` | 200 | `AuthResponse` shape matches login | P1 |
| `POST /api/auth/refresh` | 200 | DB mode rotates refresh token and returns `AuthResponse` | P1 |
| `POST /api/auth/logout` | 200 | `{ "loggedOut": true }` and refresh cookie clear | P1 |
| `GET /api/me` | 200 | `homeRegion`, `onboardingCompleted` | P0 |
| `GET /api/me/profile` | 200 | `region`, `style`, `budget` | P1 |
| `PATCH /api/me/profile` | 200 | patched profile fields returned and DB mode marks onboarding complete | P1 |
| `GET /api/profile-options` | 200 | `regions`, `travelStyles`, `budgets` | P1 |
| `GET /api/policies` | 200 | first item has `id` and `slug` | P0 |
| `GET /api/policies/local-vacation` | 200 | `amount`, `officialUrl`, `applyUrl`, policy detail shape | P0 |
| `GET /api/me/saved-policies` | 200 | `Policy[]`, DB mode returns current user's saved policies | P1 |
| `POST /api/me/saved-policies/local-vacation` | 200 | `{ "policyId": "local-vacation", "saved": true }`, DB mode persists `user_saved_policies` idempotently | P1 |
| `DELETE /api/me/saved-policies/local-vacation` | 200 | `{ "policyId": "local-vacation", "saved": false }`, DB mode removes saved policy idempotently | P1 |
| `GET /api/trips` | 200 | first item has `id`; DB mode id is numeric string | P0 |
| `GET /api/trips/{tripId}` | 200 | numeric id detail returns `Trip` shape | P0 |
| `GET /api/trips/jeju-3-days` | 200 | legacy alias works; DB mode response `id` is numeric string | P0 |
| `GET /api/trips/001` | 404 | noncanonical numeric-like handle is not id `1` | P1 |
| `GET /api/trips/0` | 404 | zero is not a canonical numeric handle | P1 |
| `POST /api/trips/{tripId}/policies/local-vacation` | 200 | `added` is true | P1 |
| `GET /api/trips/{tripId}/recommendations` | 200 | first recommendation `title` | P1 |
| `GET /api/trips/{tripId}/invite` | 200 | `inviteUrl`, `inviteToken` | P1 |
| `POST /api/trips/{tripId}/invite` | 200 | `invited` is true | P1 |
| `POST /api/trips/{tripId}/invites` | 200 | `tripId` returned | P1 |
| `POST /api/invites/jeju-3d/accept` | 200 | `acceptedAt` returned and DB mode inserts `trip_members` idempotently | P1 |

## Missing Coverage To Add When Behavior Changes

- Unknown policy slug returns the documented error.
- Unknown trip id returns the documented error.
- Invalid auth payload returns validation error.
- DB mode duplicate signup email returns 409.
- DB mode invalid login returns 401.
- DB mode `/api/me` without valid bearer token returns 401.
- DB mode invalid refresh token returns 401.
- DB mode `/api/me/profile` without valid bearer token returns 401.
- Inaccessible DB mode trip returns 404 without leaking ownership.

## DB-Backed Smoke

Profile endpoints must persist the selected onboarding preferences:

- `GET /api/me/profile` returns `region`, `style`, and `budget`.
- `PATCH /api/me/profile` stores `region` in `users.region`, `style` in `users.travel_style`, and `budget` in `users.travel_budget`.
- PATCH marks `users.onboarding_completed` true and updates `users.updated_at`.

Policy endpoints must preserve the same public response shape:

- `GET /api/policies` returns `id`, `slug`, `title`, `org`, `deadline`, `amount`, `match`, `requirements`, `documents`, `officialUrl`, and `applyUrl`.
- `GET /api/policies/local-vacation` returns the seeded policy with slug `local-vacation`.
- `GET /api/me/saved-policies` requires bearer auth and returns the current user's saved policies.
- `POST /api/me/saved-policies/local-vacation` requires bearer auth and stores one `user_saved_policies` row per user/policy pair.
- `DELETE /api/me/saved-policies/local-vacation` requires bearer auth and removes one `user_saved_policies` row per user/policy pair.
- Repeated saved policy requests return the same response without duplicate rows.
- Policy DB values stay `snake_case` internally and are mapped to the existing `camelCase`/display DTO shape before response validation.

Trip endpoints must preserve the existing public DTO shape:

- `GET /api/trips` returns only trips owned by or shared with the current bearer-token user.
- `GET /api/trips/{numericId}` returns `id`, `title`, `dates`, `people`, `expectedSaving`, and `days`.
- `GET /api/trips/jeju-3-days` remains a legacy seed alias and returns a numeric string `id`.
- Canonical numeric handles must match `^[1-9][0-9]*$`; values like `0`, `001`, and `1.0` are unknown handles.
- The legacy alias resolves only when the seed owner email, title, and date range match exactly one accessible trip.
- Unknown, inaccessible, or unsupported trip handles return `404 {"detail": "Trip not found"}`.
- Trip DB values stay `snake_case` internally and are mapped to the existing display DTO shape before response validation.
- `people` includes owner first, then member nicknames with duplicates removed.
- `expectedSaving` is the sum of linked policy `benefit_amount` values, excluding null amounts.
- `InviteState.copied` is always false from the server and is tracked locally by the frontend UI.

Invite acceptance must persist membership:

- `POST /api/invites/{inviteToken}/accept` requires bearer authentication.
- Unknown or expired invite tokens return `404 {"detail": "Invite not found"}`.
- Valid invite tokens set `trip_invites.accepted_at` when it is empty.
- Valid invite tokens add the current user to `trip_members` with role `editor` when missing.
- Repeated acceptance by the same user does not create duplicate membership rows.
