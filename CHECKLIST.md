# CHECKLIST

## Current Status

- Active task: `/home` weekly benefit ranking updated to prioritize strongly recommended policies first, then fill remaining cards by deadline-imminent order.
- Current branch: `develop` at merged PR #90; dev server deployed from clean `origin/develop` for the Home weekly benefit ranking update.
- Scope: frontend Home weekly benefit selection now uses existing `Policy.match` as recommendation strength (`match >= 90`) before deadline sorting; weekly cards remain vertical max-3 and no API/backend DTO change was introduced.
- Approved visual references: `.omx/artifacts/visual-ralph/home-weekly-benefits-vertical-top3/reference-approved-draft.png`; C option `.omx/artifacts/visual-ralph/home-popular-policy-unified-c/reference-options-abc-approved-c.png`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Frontend rules: `frontend/AGENTS.md`.
- Task spec: `.omx/specs/deep-interview-home-weekly-benefits-vertical-top3.md`; follow-up vertical-fix closure: `.omx/specs/deep-interview-home-weekly-benefits-force-vertical.md`.

## Latest Validation Evidence

- Frontend typecheck: `cd frontend && npm run typecheck` PASS.
- Frontend targeted Home tests: `cd frontend && npm test -- --run src/app/__tests__/home.test.tsx` PASS (13 tests, mojibake check PASS), including recommended-first then deadline-fill regression.
- Frontend production build: `cd frontend && npm run build` PASS.
- Frontend full tests: `cd frontend && npm test` PASS (21 files, 206 tests, mojibake check PASS).
- GitHub PR/merge: PR #90 merged into `develop` at `d270ff8570dca9be1f51910b1b4f0acf0e51449a`; CI PASS (`Backend fast lane`, `Frontend DB-backed fast lane`; release gate skipped by workflow condition).
- Development server deploy: `ssh deploy@192.168.32.15`, repo `/home/deploy/travel-hunter-app`, reset to `origin/develop` `d270ff8570dca9be1f51910b1b4f0acf0e51449a`; server worktree clean; compose config/build, DB up, Alembic upgrade, and `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d` PASS.
- Development server Home ranking smoke (`https://dev.travel-hunter.co.kr`) PASS: `/api/health` 200 with DB connected, backend healthy, Home weekly benefit cards `3`, browser-rendered order matched API-derived recommended-first/deadline-fill expectation, and no horizontal overflow at 390px.
- Responsive screenshot capture: `node frontend/scripts/run-backend-command.cjs node ../.omx/artifacts/visual-ralph/home-weekly-benefits-vertical-top3/capture-home-responsive.mjs` PASS; captured 360/390/430/1024/1440 screenshots with 3 cards, `verticalOrder: true`, AI carousel `visibleCardCount: 1` at every width, no max-3 note text, red/coral C-style hero accent/CTA present, no `.prototype-home-policy-rail`, and no document overflow.
- Visual Ralph verdict: `.omx/artifacts/visual-ralph/home-popular-policy-unified-c/visual-verdict.json` PASS score 92; secondary canvas diff recorded at `.omx/artifacts/visual-ralph/home-popular-policy-unified-c/pixel-diff-reference-c-vs-current-390.png`.
- Docker frontend rebuild/recreate: `docker compose -f compose.yaml build frontend && docker compose -f compose.yaml up -d --force-recreate frontend` PASS.
- Live 4173 Playwright check at 390px PASS: AI carousel `--carousel-side-peek: 0%`, `--carousel-slide-width: 100%`, `visibleCardCount: 1`, previous/next controls present, no horizontal overflow; max-3 note hidden, C-style hero accent count `1`, CTA `자세히 보기 →`, weekly card boxes top coordinates `396 -> 629 -> 862`, `cardCount: 3`; popular-policy hero green/mint tokens replaced with red/coral palette in `frontend/src/styles/app.css`.

- GitHub PR/merge: PR #88 merged into `develop` at `b2445fa4f7de1136f255a59fa2cd8e98dc4e89b2`; CI PASS (`Backend fast lane`, `Frontend DB-backed fast lane`; release gate skipped by workflow condition).
- Development server deploy: `ssh deploy@192.168.32.15`, repo `/home/deploy/travel-hunter-app`, reset to `origin/develop` `b2445fa4f7de1136f255a59fa2cd8e98dc4e89b2`; dirty backup not needed; compose config/build, DB up, Alembic upgrade, and `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d` PASS.
- Development server core smoke (`https://dev.travel-hunter.co.kr`) PASS: `/api/health` 200 with DB connected, login redirects to `/home`, Home weekly cards `3` with vertical order, AI carousel visible card count `1` with prev/next controls, no horizontal overflow, removed max-3 note absent, `/policies` 200, `/policies/travelmonth-25` 200, `/trips` 200, `/trips/new` 200.

## Remaining Risks

- Provider/release smoke remains out of scope for this pass: OAuth, SMTP, admin ops, SOLAPI, Kakao provider smoke were intentionally not run.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
