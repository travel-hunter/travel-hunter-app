# CHECKLIST

## Current Status

- Latest validated scope: local UX specification split, legacy document cleanup, archive-candidate document removal, `CHECKLIST.md` slimming, Brevo/Cloudflare email delivery specification, domain-dependent work reprioritization, Auth Account domain-independent local UX implementation, frontend test baseline recovery, `docs/next-work-plan.md` cleanup, Policy To Trip Linking no-link CTA UX improvement, Policy To Trip Linking success/info-only action clarity, policy-trip residual priority cleanup, MyPage saved/applied policy summary consistency, agent/spec rule-wording and stale-reference doc cleanup, `docs/current-work-spec.md` mojibake recovery, and the `Policy.actionStatus` response-schema fix.
- Last validation date: 2026-06-05.
- This file intentionally keeps only current status, recent validation evidence, and remaining risks. Older detailed work logs are left to git history and source-specific documents.

## Current Source Documents

- Product/API source of truth: `docs/current-work-spec.md`, `docs/mvp-api-contract.md`.
- Local UX implementation priorities: `docs/specs/spec-index.md`.
- Local UX auth/account spec: `docs/specs/local-ux-auth-account.md`.
- Local UX policy-trip linking spec: `docs/specs/local-ux-policy-trip-linking.md`.
- Local UX place discovery spec: `docs/specs/local-ux-place-discovery.md`.
- Password reset email delivery specification: `docs/brevo-cloudflare-email-guide.md`.
- Screen/page status reference: `docs/screen-feature-status-screens.md`.
- Logic/API/recommendation status reference: `docs/screen-feature-status-logic.md`.

## Latest Validations

- 2026-06-03 frontend UI CSS cleanup: `cd frontend && npx vitest run src/App.test.tsx -t "shows policy result counts, search, and priority ordering"` passed.
- 2026-06-03 frontend UI CSS cleanup: `cd frontend && npx vitest run src/App.test.tsx -t "links normalized TravelMonth policy slugs when creating a trip"` passed.
- 2026-06-03 frontend UI CSS cleanup: `cd frontend && npx vitest run src/App.test.tsx -t "policy"` passed with 31 tests.
- 2026-06-03 frontend UI CSS cleanup: `cd frontend && npm run typecheck` passed.
- 2026-06-03 frontend UI CSS cleanup: `cd frontend && npm test` passed with 6 files and 144 tests.
- 2026-06-03 frontend UI CSS cleanup: `cd frontend && npm run build` passed.
- 2026-06-03 frontend UI CSS cleanup visual smoke: local dev server rendered authenticated `/home`, `/policies`, `/trips`, `/mypage`, `/trips/1`, and `/ai-results?tripId=1` at 390, 1024, and 1440 widths with nonblank roots and no horizontal overflow. Known API gaps were limited to missing seeded trip id 1.
- 2026-06-04 local UX spec split: added the three local UX spec documents under `docs/specs/`.
- 2026-06-04 document cleanup: updated legacy/status document notes and converted the spec index from archive-candidate tracking to removed-document replacement tracking.
- 2026-06-04 document cleanup validation: docs/specs relative Markdown link existence check passed.
- 2026-06-04 document cleanup validation: no Markdown links remain in active docs to removed archive-candidate documents.
- 2026-06-04 document cleanup validation: `git diff --check -- docs CHECKLIST.md` passed.
- 2026-06-04 checklist slimming validation: `CHECKLIST.md` has no `2026-05` entries or removed-document filename references, and `git diff --check -- CHECKLIST.md` passed.
- 2026-06-04 checklist routine: `AGENTS.md` Done Criteria now requires keeping `CHECKLIST.md` slim and validating it with `git diff --check -- CHECKLIST.md` whenever it changes.
- 2026-06-04 Brevo/Cloudflare email delivery specification: added `docs/brevo-cloudflare-email-guide.md` and linked it from `docs/specs/spec-index.md`.
- 2026-06-04 Brevo/Cloudflare email delivery specification validation: `git diff --check -- docs\brevo-cloudflare-email-guide.md docs\specs\spec-index.md CHECKLIST.md` passed.
- 2026-06-04 priority update: domain-dependent SMTP/OAuth/public DNS smoke work moved behind domain-independent local UX completion in `docs/specs/spec-index.md` and `docs/specs/local-ux-auth-account.md`.
- 2026-06-04 priority update validation: `git diff --check -- docs\specs\spec-index.md docs\specs\local-ux-auth-account.md CHECKLIST.md` passed.
- 2026-06-04 Auth Account local UX deep-interview: scope fixed to password reset + OAuth missing-env UX, with tests plus local screen smoke as completion evidence.
- 2026-06-04 Auth Account local UX deep-interview validation: `git diff --check -- CHECKLIST.md` passed.
- 2026-06-04 Auth Account local UX implementation validation: `cd frontend && npm run typecheck` passed.
- 2026-06-04 Auth Account local UX implementation validation: `cd frontend && npx vitest run src/App.test.tsx -t "forgot password|reset-password|OAuth"` passed with 6 tests.
- 2026-06-04 Auth Account local UX implementation smoke: local Vite `http://127.0.0.1:5173` rendered `/forgot-password`, `/reset-password`, `/reset-password?token=invalid`, `/oauth/callback?error=access_denied&redirect=/home`, and `/oauth/kakao/start?redirect=/home` at 390px width with expected selectors and no horizontal overflow.
- 2026-06-04 encoding guardrail update validation: `git diff --check -- AGENTS.md .editorconfig CHECKLIST.md` passed.
- 2026-06-04 frontend baseline recovery: fixed the date-dependent `shows policy result counts, search, and priority ordering` test and `cd frontend && npm test -- --run src/App.test.tsx -t "shows policy result counts, search, and priority ordering"` passed.
- 2026-06-04 next-work-plan cleanup: rewrote `docs/next-work-plan.md` as a short reference document that points to active local UX specs and removes mojibake/stale deployment priority guidance.
- 2026-06-04 Policy To Trip Linking UX: policy detail now shows a visible explanation when no official/apply link is available, and the disabled CTA has an accessible description.
- 2026-06-04 Policy To Trip Linking validation: `cd frontend && npm test -- --run src/App.test.tsx -t "keeps the application notice fallback when a policy has no official links"` passed.
- 2026-06-04 full frontend validation: `cd frontend && npm run typecheck` passed.
- 2026-06-04 full frontend validation: `cd frontend && npm test` passed with 6 files and 149 tests.
- 2026-06-04 ultragoal final validation: `cd frontend && npm test -- --run src/App.test.tsx` passed with 131 tests after resolving selector-based Auth test review feedback.
- 2026-06-04 ultragoal final review: independent code review returned `Recommendation: APPROVE`; independent architecture review returned `Architectural Status: CLEAR`.
- 2026-06-04 WSL migration validation: Windows tracked changes and selected untracked docs/config were mirrored to `/home/hp/projects/travel-hunter-app`; WSL `cd frontend && npm run typecheck` passed.
- 2026-06-04 WSL migration validation: WSL `cd frontend && PYTHON=../backend/.venv/bin/python npm test` passed with 6 files and 149 tests; the frontend backend-test helper now prefers backend `.venv` Python when `PYTHON` is unset.
- 2026-06-04 WSL migration validation: WSL `cd frontend && npm test` passed with 6 files and 149 tests after the backend-test helper defaulted to backend `.venv` Python.
- 2026-06-04 WSL migration validation: WSL `cd backend && .venv/bin/python -m pytest` passed with 409 tests after fixing the date-dependent invite display flag fixture.
- 2026-06-04 Policy To Trip Linking success/info-only clarity validation: `cd frontend && npm run typecheck` passed.
- 2026-06-04 Policy To Trip Linking success/info-only clarity validation: `cd frontend && npx vitest run src/App.test.tsx -t "opens the policy trip picker|blocks save and trip actions"` passed with 2 tests.
- 2026-06-04 Policy To Trip Linking contract validation: `python3 -m json.tool .agent/evals/api-contract-golden.json >/dev/null` and `git diff --check -- frontend/src/App.test.tsx frontend/src/pages/PolicyPages.tsx frontend/src/api/types.ts frontend/src/utils/policyCapabilities.ts docs/mvp-api-contract.md .agent/evals/api-contract-golden.json` passed.
- 2026-06-04 policy-trip residual priority cleanup: `PLANS.md` and `docs/next-work-plan.md` now keep deployment/provider smoke deferred and start the immediate sequence with MyPage saved/applied policy consistency; `docs/specs/local-ux-policy-trip-linking.md` now separates completed action-clarity work from remaining local gaps.
- 2026-06-04 MyPage policy summary consistency validation: `cd frontend && npx vitest run src/App.test.tsx -t "favorite summary|shows saved policies on my page and removes them|applied policy summary|unlinked policies"` passed with 4 tests.
- 2026-06-04 MyPage policy summary consistency validation: `cd frontend && npm run typecheck` passed.
- 2026-06-04 App test split validation: `cd frontend && npm run typecheck` passed.
- 2026-06-04 App test split validation: `cd frontend && npm test -- --run src/App.test.tsx src/components/patterns.test.tsx src/pages/admin/AdminPages.test.tsx` passed with 3 files and 132 tests.
- 2026-06-04 App test split follow-up: renamed the full-app route helper to `renderAppRoute`, added `frontend/src/test/README.md` with helper boundaries, second-stage split candidates, and worktree grouping guidance.
- 2026-06-04 App test split follow-up validation: `cd frontend && npm run typecheck` passed.
- 2026-06-04 App test split follow-up validation: `cd frontend && npm test -- --run src/App.test.tsx src/components/patterns.test.tsx src/pages/admin/AdminPages.test.tsx` passed with 3 files and 135 tests.
- 2026-06-05 doc cleanup: audited agent/spec rule wording (encoding guardrail, redundant rules, stale `docs/security-review/` gate), cleared stale references to deleted `.omx`/`docs/superpowers` artifacts, and recovered `docs/current-work-spec.md` from UTF-8/CP949 mojibake via the pre-corruption commit `dc7ddc8`.
- 2026-06-05 backend baseline fix: `actionStatus="infoOnly"` was emitted by the policy service raw-fallback path but missing from the `Policy` response schema, so the real endpoint stripped it; added the schema field. `cd backend && .venv/bin/python -m pytest` passed with 409 tests (previously 1 failed).
- 2026-06-05 baseline note: `cd frontend && npm run typecheck` passed and the frontend mojibake guard passed; the full `npm test` vitest suite could not run because Docker Desktop WSL integration is inactive (backend compose PostgreSQL unavailable).

## Remaining Risks

- The current worktree contains unrelated pre-existing frontend and documentation changes; recent work intentionally touched frontend auth/policy UX, tests, current planning docs, and checklist state.
- Domain-dependent Brevo/Cloudflare, SMTP, OAuth redirect, public DNS, and staging smoke work is intentionally deferred.
- Deployment and CI/CD work remain lower priority than local feature completion.
- Kakao Maps SDK rendering still depends on configured JavaScript key and allowed web domains.
- Policy-trip linking completion and place discovery improvements remain tracked as local UX priorities in `docs/specs/spec-index.md`.
- `docs/current-work-spec.md` contains pre-existing mojibake in the committed baseline and should be repaired or retired in favor of the split `docs/specs/` sources in a separate documentation cleanup pass.

## Cleanup Policy

- Keep only current status, recent validation evidence, and active remaining risks in this file.
- Do not append long historical task logs. Prefer updating source-specific docs or leaving obsolete detail in git history.
- When removing or archiving documents, record the replacement source in `docs/specs/spec-index.md`.
- Encoding check for Korean-bearing files: follow the canonical UTF-8 Encoding rule in `AGENTS.md` ("Non-Negotiable Rules") and run `git diff --check` before claiming completion.
