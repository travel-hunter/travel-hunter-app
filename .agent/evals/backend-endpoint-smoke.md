# Backend Endpoint Smoke Eval

## Source

- API contract: `docs/mvp-api-contract.md`
- Current tests: `backend/tests/test_mock_api.py`

## Endpoint Matrix

| Endpoint | Expected | Key assertions | Priority |
|---|---:|---|---|
| `GET /health` | 200 | service health response is available | P1 |
| `GET /api/health` | 200 | `status`, `service`, `environment`, `database` | P0 |
| `POST /api/auth/login` | 200 | `accessToken`, `user.name`, `user.preferredRegions` | P0 |
| `POST /api/auth/signup` | 200 | `AuthResponse` shape matches login | P1 |
| `GET /api/me` | 200 | `homeRegion`, `onboardingCompleted` | P0 |
| `PATCH /api/me/profile` | 200 | patched profile fields returned | P1 |
| `GET /api/profile-options` | 200 | `regions`, `travelStyles`, `budgets` | P1 |
| `GET /api/policies` | 200 | first item has `id` and `slug` | P0 |
| `GET /api/policies/local-vacation` | 200 | `amount`, policy detail shape | P0 |
| `POST /api/me/saved-policies/local-vacation` | 200 | `{ "policyId": "local-vacation", "saved": true }` | P1 |
| `GET /api/trips` | 200 | first item has `id` | P0 |
| `GET /api/trips/jeju-3-days` | 200 | `title` is stable | P0 |
| `POST /api/trips/jeju-3-days/policies/local-vacation` | 200 | `added` is true | P1 |
| `GET /api/trips/jeju-3-days/recommendations` | 200 | first recommendation `title` | P1 |
| `GET /api/trips/jeju-3-days/invite` | 200 | `inviteUrl`, `inviteToken` | P1 |
| `POST /api/trips/jeju-3-days/invite` | 200 | `invited` is true | P1 |
| `POST /api/trips/jeju-3-days/invites` | 200 | `tripId` returned | P1 |
| `POST /api/invites/jeju-3d/accept` | 200 | `acceptedAt` returned | P1 |

## Missing Coverage To Add When Behavior Changes

- Unknown policy slug returns the documented error.
- Unknown trip id returns the documented error.
- Invalid auth payload returns validation error.
- Invite accept with unknown token returns the documented error.

## DB Mode Smoke

When `BACKEND_DATA_SOURCE=db` is used, policy endpoints must preserve the same public response shape:

- `GET /api/policies` returns `id`, `slug`, `title`, `org`, `deadline`, `amount`, `match`, `requirements`, and `documents`.
- `GET /api/policies/local-vacation` returns the seeded policy with slug `local-vacation`.
- Policy DB values stay `snake_case` internally and are mapped to the existing `camelCase`/display DTO shape before response validation.
