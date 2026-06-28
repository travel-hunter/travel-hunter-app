# CHECKLIST

## Current Status

- Active task: local dirty work cleanup for commit/PR prep.
- Current branch: `develop`, now ahead of `origin/develop` with local cleanup commits; push/PR/deploy have not been performed.
- Local commits created so far:
  - `92a124f Clarify trip preview actions before saving`
  - `a348258 Streamline new trip creation before checkout`
- Final cleanup commit in progress: shared gutter CSS + handoff/checklist evidence.
- Tomorrow handoff source of truth remains `.omx/specs/deep-interview-today-local-wrap-tomorrow-start.md`.

## Local Work Summary

- `/trips/{tripId}` recommendation preview/save UX: preview sandbox semantics, saved-place reorder recovery, compact recommendation metadata, unified action buttons/time controls, related trip-detail tests and e2e spec changes.
- `/trips/new` creation UX: policy-linked region step skip when resolvable, unified checkout-style form, course-style modal with confirm-only apply behavior, red/coral visual tone, and course-style emoji labels.
- Shared UI spacing: app gutter token direction for `/home`, `/policies`, `/trips`, `/mypage`, with most current visual validation focused on `/trips/new`.
- Key artifacts:
  - `.omx/specs/deep-interview-today-local-wrap-tomorrow-start.md`
  - `.omx/specs/deep-interview-trip-detail-recommendation-save-ux.md`
  - `.omx/specs/deep-interview-trip-detail-saved-place-reorder.md`
  - `.omx/specs/deep-interview-trip-button-style-unification.md`
  - `.omx/specs/deep-interview-policy-new-trip-skip-region-step.md`
  - `.omx/specs/deep-interview-new-trip-unified-checkout-form.md`
  - `.omx/specs/deep-interview-home-card-gutter-unification.md`
  - `.omx/artifacts/visual-ralph/new-trip-red-coral-gutter/visual-verdict-final.json`
  - `.omx/artifacts/visual-ralph/trip-button-style-audit/`
  - `.omx/artifacts/visual-ralph/trip-preview-button-unification/`
  - `.omx/artifacts/trip-card-slim-plan/`

## Latest Validation Evidence

- Final HEAD: `cd frontend && npm test -- trip-create.test.tsx` PASS (19 tests).
- Final HEAD: `cd frontend && npm run build` PASS; includes `npm run typecheck`.
- Final HEAD: `cd frontend && npm test -- trip-detail.test.tsx` PASS (31 tests).
- Local Docker frontend rebuild/recreate for `/trips/new` visual pass: `docker compose -f compose.yaml build frontend && docker compose -f compose.yaml up -d --force-recreate frontend` PASS; `http://127.0.0.1:4173/trips/new` returned 200 OK.
- `/trips/new` Playwright visual/computed check against `http://127.0.0.1:4173` PASS with Browser plugin absent fallback:
  - 390x844 and 1024x900 checked.
  - Red/coral computed accents confirmed: primary CTA/progress/step badges `rgb(255, 94, 91)`, soft surfaces `rgb(255, 245, 244)`.
  - Mobile card left/right gutter is 16px; desktop unified cards fill app-shell width instead of previous 560px cap.
- Visual Ralph `/trips/new` verdict: `.omx/artifacts/visual-ralph/new-trip-red-coral-gutter/visual-verdict-final.json` score 94 PASS.
- Hygiene: `git diff --check origin/develop..HEAD` PASS; no U+FFFD replacement characters found in changed Korean-bearing files.

## PR Prep Next Steps

1. Confirm final worktree is clean after the cleanup/evidence commit.
2. Rerun or decide whether to rely on latest targeted evidence:
   - `cd frontend && npm test -- trip-create.test.tsx`
   - `cd frontend && npm test -- trip-detail.test.tsx`
   - `cd frontend && npm run build`
3. If preparing release/dev sync, also run `cd frontend && npm test` and `cd frontend && npm run test:e2e` if time allows.
4. Push only after explicit user approval.
5. PR body should describe three scopes:
   - trip detail recommendation preview/save/reorder/button UX,
   - `/trips/new` unified creation flow,
   - shared gutter + red/coral/emoji visual polish.

## Remaining Risks

- Full frontend test suite and full Playwright e2e were not rerun after all local changes.
- `/home`, `/policies`, `/trips`, `/mypage` shared gutter change has not had a fresh full 360/390/430/1024/1440 four-page responsive audit during this wrap.
- Course-style emoji preview-render smoke at `127.0.0.1:4174` timed out before modal entry; targeted tests and production build passed.
- Browser plugin was not available in this session, so rendered validation used Playwright fallback.
- Push, PR creation, deployment, and cross-browser manual QA have not been performed.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, PR prep instructions, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
