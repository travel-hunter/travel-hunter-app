# CHECKLIST

## Current Status

- Latest validated scope: frontend validation baseline, Policy To Trip Linking local runtime smoke, map bottom-sheet place detail dialog, itinerary edit-flow Place Search/Add, documentation authority simplification, local UX specification split, domain-dependent work reprioritization, Auth Account domain-independent local UX, Policy To Trip Linking action clarity, MyPage saved/applied policy summary consistency, agent/spec rule-wording cleanup, and the `Policy.actionStatus` response-schema fix.
- Last validation date: 2026-06-05.
- This file intentionally keeps only current status, recent validation evidence, and remaining risks. Older detailed work logs are left to git history and source-specific documents.

## Current Source Documents

- Product requirements: `docs/requirements.md`.
- Implemented feature/status inventory: `docs/implemented-feature-spec.md`.
- Next-work execution queue: `docs/next-work-plan.md`.
- API source of truth: `docs/mvp-api-contract.md`.
- Local UX spec index: `docs/specs/spec-index.md`.
- Local UX auth/account spec: `docs/specs/local-ux-auth-account.md`.
- Local UX policy-trip linking spec: `docs/specs/local-ux-policy-trip-linking.md`.
- Local UX place discovery spec: `docs/specs/local-ux-place-discovery.md`.
- Password reset email delivery specification: `docs/brevo-cloudflare-email-guide.md`.
- Screen/page status reference: `docs/screen-feature-status-screens.md`.
- Logic/API/recommendation status reference: `docs/screen-feature-status-logic.md`.

## Latest Validations

- 2026-06-05 frontend baseline: `cd frontend && npm run typecheck` passed.
- 2026-06-05 frontend baseline: `cd frontend && npm test` passed with 8 files and 155 tests. The test helper started compose PostgreSQL on `127.0.0.1:55432`, applied Alembic migrations, seeded development data, and ran FastAPI on `127.0.0.1:8001`.
- 2026-06-05 Policy To Trip Linking runtime smoke: `cd frontend && npm run test:e2e -- -g "normalized policy save, unsave, trip link, and unlink"` passed with 1 Playwright backend-mode test.
- 2026-06-05 Place Detail local UX: `cd frontend && npm test -- --run src/App.test.tsx -t "opens an inspectable place detail dialog"` passed with 1 selected test after the RED test failed on the previous toast-only behavior.
- 2026-06-05 Place Detail adjacent coverage: `cd frontend && npm test -- --run src/App.test.tsx -t "toggles itinerary detail between list and map views|opens an inspectable place detail dialog|uses stored Kakao place URL"` passed with 3 selected tests.
- 2026-06-05 Place Search/Add RED: `cd frontend && npm test -- --run src/App.test.tsx -t "searches recommendation candidates from the add-place sheet"` failed because the add-place sheet did not call `listRecommendations`.
- 2026-06-05 Place Search/Add GREEN: `cd frontend && npm test -- --run src/App.test.tsx -t "searches recommendation candidates from the add-place sheet"` passed with 1 selected test.
- 2026-06-05 Place Search/Add adjacent coverage: `cd frontend && npm test -- --run src/App.test.tsx -t "adds, edits, and deletes places from the itinerary detail|searches recommendation candidates from the add-place sheet|restores and clears add-place drafts"` passed with 3 selected tests.
- 2026-06-05 frontend test stabilization: `cd frontend && npm test -- --run src/App.test.tsx -t "edits profile preferences from my page|opens an inspectable place detail dialog"` passed with 2 selected tests after the MyPage profile editor test was changed to wait for loaded option buttons.
- 2026-06-05 backend baseline: `cd backend && .venv/bin/python -m pytest` passed with 409 tests after the `Policy.actionStatus` response-schema fix.
- 2026-06-05 documentation/spec cleanup: `docs/next-work-plan.md`, `docs/specs/local-ux-policy-trip-linking.md`, `docs/specs/local-ux-place-discovery.md`, `docs/specs/spec-index.md`, and `CHECKLIST.md` were updated to move validated Policy To Trip Linking and Place Detail work out of remaining gaps.
- 2026-06-05 documentation authority simplification: the mixed-role work summary document was retired; root/docs stale-reference, index priority-owner wording, file absence, UTF-8 replacement-character, and `git diff --check` validations passed.

## Remaining Risks

- Domain-dependent Brevo/Cloudflare, SMTP, OAuth redirect, public DNS, and staging smoke work is intentionally deferred.
- Deployment and CI/CD work remain lower priority than local feature completion.
- Kakao Maps SDK rendering still depends on configured JavaScript key and allowed web domains.
- Kakao Local candidate smoke and fallback candidate quality remain the next place discovery priorities in `docs/next-work-plan.md`.
- Policy list server search/pagination remains a follow-up only if local policy volume outgrows client-side filtering.

## Cleanup Policy

- Keep only current status, recent validation evidence, and active remaining risks in this file.
- Do not append long historical task logs. Prefer updating source-specific docs or leaving obsolete detail in git history.
- When removing or archiving documents, record the replacement source in `docs/specs/spec-index.md`.
- Encoding check for Korean-bearing files: follow the canonical UTF-8 Encoding rule in `AGENTS.md` ("Non-Negotiable Rules") and run `git diff --check` before claiming completion.
