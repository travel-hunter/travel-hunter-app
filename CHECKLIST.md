# CHECKLIST

## Current Status

- Active task: Home `이번 주 혜택` card content addition after deep-interview and Visual Ralph reference approval.
- Current branch: `develop`.
- Scope: add one-line policy summary and one compact 신청 조건 chip to the Home weekly-benefit cards while preserving horizontal swipe, PC mouse drag, policy detail links, and the removed `인기 국내 여행지` section/API path.
- Non-goals: no official/apply buttons inside cards, no full detailed condition sentences, no backend/API/schema changes, no new dependencies, no full Home redesign, no AI 추천 맞춤 일정 removal.
- Visual/planning source of truth: `.omx/specs/deep-interview-home-weekly-benefit-card-content.md`, `.omx/artifacts/visual-ralph/home-weekly-benefit-card-content/reference.html`, and `.omx/artifacts/visual-ralph/home-weekly-benefit-card-content/reference-390.png`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Frontend rules: `frontend/AGENTS.md`.
- Home screen status: `docs/screen-feature-status-screens.md`.

## Latest Validation Evidence

- Visual Ralph reference approval: user approved the reference showing icon/category, title, summary 1 line, condition chip, and amount/deadline with no official/apply button.
- Browser/Visual Ralph implementation capture: PASS, score 93, verdict `pass` in `.omx/artifacts/visual-ralph/home-weekly-benefit-card-content/visual-ralph-verdict.json`; screenshots and metrics captured at 360/390/430/1024/1440 px under `.omx/artifacts/visual-ralph/home-weekly-benefit-card-content/`.
- Responsive/browser metrics: no document horizontal overflow, `인기 국내 여행지` text absent, weekly rail scrollable, 4 policy cards, summary text present with one-line ellipsis styling, condition chip present, official/apply buttons count 0.
- Typecheck: `cd frontend && npm run typecheck` PASS.
- Targeted Home tests: `cd frontend && npx vitest run src/app/__tests__/home.test.tsx` PASS (10 tests).
- Frontend unit suite: `cd frontend && npm test` PASS (21 files, 199 tests, mojibake check PASS).
- Frontend e2e suite: `cd frontend && npm run test:e2e` PASS (11 Playwright backend-mode tests).
- Production build: `cd frontend && npm run build` PASS.

## Remaining Risks

- React Router v7 future-flag warnings still appear in existing test/browser logs and are unrelated to this change.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
