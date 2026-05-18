# Travel Hunter Current Change Work Spec

## Summary

This change set consolidates the current prototype-driven frontend refresh, policy/trip UX updates, and supporting backend/data adjustments into one commit-ready baseline.

The core direction is to keep the existing DB-backed FastAPI/React product behavior while reshaping the user-facing screens around the uploaded mobile prototype style. Runtime mock mode is not restored, and existing auth, policy, trip, invite, notification, and draft autosave flows remain connected to the backend.

## Included Changes

- App shell and responsive layout:
  - Auth screens keep the 440px prototype login frame.
  - Authenticated app screens use full mobile width, 760px on tablet/desktop, and 820px on wide desktop.
  - Bottom tabs stay inside the app frame and remain fixed to the bottom of the service layout.
- Prototype UI refresh:
  - Landing/onboarding entry is removed from `/`; `/` and `/login` use the prototype login screen.
  - `/home`, `/policies`, `/policies/:policyId`, `/trips`, `/trips/new`, `/trips/:tripId`, and `/mypage` are restyled toward the prototype card, tab, CTA, and bottom-navigation patterns.
  - Primary interaction colors are aligned to the red prototype palette.
  - Policy filter chips and the `초기화` action use a softer red pill style for visual consistency.
- Account/profile UX:
  - Signup keeps the email/password flow with email duplication check.
  - Nickname setup and nickname suggestion remain available.
  - `/mypage` profile editing now includes nickname editing and random nickname suggestion in the same profile edit sheet.
- Policy and trip behavior:
  - Policy list/detail screens keep real API-backed filtering, save, share, official link, and trip attachment behavior.
  - Trip creation keeps draft autosave, region/date/title flow, and policy attachment.
  - Trip list/detail keep delete confirmation, status save, place CRUD, time picker, DnD place movement, AI recommendation attach, and invite flows.
- Backend/data support:
  - Trip create/status and seed/test updates remain aligned with the current frontend behavior.
  - A local data crawler script and generated regional tour-card policy data are included as supporting policy-data work.

## Public Interfaces

- No route URL is removed from the current app contract.
- No new runtime mock mode is introduced.
- Existing API boundaries remain the source of truth for frontend data.
- Current backend changes are limited to the already modified trip/data/schema/service/test surface in the working tree.
- New source/data artifacts included:
  - `backend/scripts/crawl_dgtourcard.py`
  - `backend/app/data/dgtourcard_policies.json`
  - `docs/local-dev-runtime.md`

## Verification Record

- Frontend:
  - `npm run typecheck`: passed.
  - `npm test -- --run`: passed, 66 tests.
  - `npm run build`: passed.
- Static:
  - `git diff --check`: passed.

Backend pytest should be run before or immediately after the commit because this change set includes backend service/schema/test changes.

## Next Work

- Push the committed baseline after backend verification.
- Continue visual QA on the widened desktop app frame for `/policies`, `/trips`, and `/mypage`.
- Decide whether crawler-generated policy data needs encoding cleanup before using it as production seed data.
- Resume staging smoke work after the UI baseline is committed.
