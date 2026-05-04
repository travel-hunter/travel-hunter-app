# Frontend Route Smoke Eval

## Source

- App routes are documented in `docs/current-work-spec.md`.
- Current e2e smoke test is `frontend/e2e/app-smoke.spec.ts`.

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
