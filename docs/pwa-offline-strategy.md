# PWA Service Worker And Offline Strategy

## Decision

Do not add a service worker yet.

Travel Hunter already has PWA install metadata through `manifest.webmanifest`, theme color, Apple mobile meta, and app icons. The next offline step needs a stricter caching policy because the app is DB-backed-only and most user-facing data is authenticated.

## Current PWA Scope

- `frontend/public/manifest.webmanifest`
- `frontend/public/icons/icon-192.png`
- `frontend/public/icons/icon-512.png`
- `frontend/public/icons/maskable-512.png`
- `frontend/index.html` manifest and mobile meta tags
- Vite production sourcemap disabled

This supports mobile home-screen install metadata, not offline runtime behavior.

## Offline Caching Policy

If a service worker is added later, the first version should cache only the application shell and static assets.

Allowed cache targets:

- built `index.html`
- built JS/CSS assets
- app icons
- manifest

Do not cache:

- `/api/*`
- auth responses
- refresh token flows
- password reset links or tokens
- OAuth callback pages
- user profile/contact/notification data
- trips, policies, invites, notification delivery data

Reason: stale authenticated API responses can show the wrong user state, outdated invite permissions, expired reset/session state, or old policy/trip data.

## Recommended V1 Behavior

- Use network-first for navigation requests.
- Use cache-first for hashed static assets.
- Show the browser default failure for offline authenticated pages in v1.
- Do not implement background sync or offline mutation queues.
- Do not cache sensitive pages such as `/reset-password` or `/oauth/callback`.
- Update strategy should be explicit: when new assets are available, activate the new service worker only after reload or a clear user prompt.

## Acceptance Criteria For Future Implementation

- App install metadata remains valid.
- `npm run build` creates no sourcemaps.
- Offline reload of the installed app shell is possible only if it does not expose stale authenticated data.
- API requests still fail normally when offline; no cached API response is served.
- Login/logout/session refresh behavior remains backend-driven.
- Lighthouse/Application tab confirms the service worker scope is `/`.

## Current Next Step

Keep service worker implementation deferred until an external staging smoke is complete. The current next priority remains:

1. Cloudflare Tunnel full-up with real `deploy/.env.tunnel` values.
2. External HTTPS smoke for `/api/health`, `/login`, `/policies`, and `/trips`.
3. Real SMTP provider password reset staging smoke.
4. Kakao/Google OAuth provider console smoke.
