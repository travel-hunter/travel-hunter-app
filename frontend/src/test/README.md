# Frontend Test Helpers

This directory owns shared test support only. Keep production code and API
runtime behavior out of this layer.

## Helper Boundaries

- `fixtures.ts` owns typed test data factories and constants shared by multiple
  test files.
- `renderAppRoute.tsx` owns full-app route rendering helpers. Use
  `renderAppRoute` only for route or app-shell integration tests because it
  renders `App` inside `AppProviders`.
- `kakaoMock.ts` owns Kakao Maps SDK test doubles and browser globals.
- Keep component-only tests self-contained unless they genuinely need shared
  typed fixtures.

## App.test Second-Stage Split Candidates

Do not move these yet. The next natural split should be chosen by route
ownership and fixture overlap:

- Trip creation and travel-area recommendation flows:
  `/trips/new`, itinerary generation, selected dates, and travel-area query
  setup.
- Trip detail and itinerary editing flows:
  `/trips/:tripId`, day/view/place query params, map candidates, place
  add/edit/delete, invite state, and trip policy recommendations.
- AI results flows:
  `/ai-results?tripId=...`, candidate selection, day filtering, and map-first
  recommendation behavior.
- Policy list/detail flows:
  `/policies`, `/policies/:policySlug`, official/apply link behavior,
  policy-trip attachment, and info-only policy states.
- My page/account flows:
  `/mypage`, saved/applied policies, profile preferences, contact verification,
  and notification settings.
- Auth and invite edge flows:
  forgot/reset password, OAuth callback/start routes, invite acceptance, and
  redirect preservation.

Keep `App.test.tsx` as the app-shell smoke and cross-route regression surface
until one of these groups is split with equivalent targeted coverage.

## Worktree Cleanup Grouping

Keep this test cleanup separate from unrelated UX, docs, backend, and API
contract work already present in the worktree. A clean review or commit group
for this cleanup should include only:

- `frontend/src/App.test.tsx`
- `frontend/src/components/patterns.test.tsx`
- `frontend/src/pages/admin/AdminPages.test.tsx`
- `frontend/src/test/*`
- `CHECKLIST.md`
