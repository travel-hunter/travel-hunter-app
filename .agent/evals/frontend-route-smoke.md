# Frontend Route Smoke Eval

## Source

- App routes are documented in `docs/current-work-spec.md`.
- Current e2e smoke test is `frontend/e2e/app-smoke.spec.ts`.
- Backend-mode e2e smoke test is `frontend/e2e-backend/backend-mode.spec.ts`.

## Public Routes

These routes must render without authentication:

- `/`
- `/login`
- `/signup`

Expected:

- `#root` is not empty.
- Login and signup entry points are visible where expected.
- No prototype-only framing copy appears.

## Protected Redirect

- Anonymous visit to `/home` redirects to `/login`.
- Login form email and password inputs are visible.

## Authenticated Routes

After login, these routes must render without blank root:

- `/profile-setup`
- `/home`
- `/policies`
- `/policies/local-vacation`
- `/trips`
- `/trips/new`
- `/trips/jeju-3-days`
- `/ai-results`
- `/friend-invite`
- `/mypage`

## Forbidden Copy

The visible app body must not contain:

- `Travel Hunter Production`
- `9:41`
- `5G`
- `WiFi`
- `85%`
- `Prototype`
- `mock`
- `Sprint`

## Responsive Viewports

Core screens must not exceed viewport width by more than 4 px at:

- 360 x 780
- 390 x 844
- 430 x 932
- 1024 x 768
- 1440 x 900

Core screens:

- `/`
- `/login`
- `/home`
- `/policies/local-vacation`
- `/trips/jeju-3-days`

## Backend Mode Integration Smoke

Run with:

```bash
cd frontend
npm run test:e2e:backend
```

Expected:

- Compose PostgreSQL is started on host `127.0.0.1:55432`.
- Alembic migration and development seed run before the browser test.
- FastAPI runs on `127.0.0.1:8001`.
- Vite runs with `VITE_DATA_SOURCE=backend` on `127.0.0.1:5174`.
- Anonymous `/home` redirects to `/login`.
- Seed login reaches `/home`.
- Policy detail `/policies/local-vacation` renders through the real backend.
- Trip list returns a canonical numeric trip id.
- Trip detail, AI recommendations, friend invite, and logout run through backend APIs.
- Legacy `jeju-3-days` either canonicalizes to numeric id when there is one exact seed match, or fails closed with 404 in a dirty shared dev DB.
