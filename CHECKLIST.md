# CHECKLIST

## Current Status

- Active task: `/policies` premium unified filter sheet redesign from `.omx/specs/deep-interview-policies-filter-unified-ux-redesign.md`.
- Current branch: `develop`.
- Scope: frontend `/policies` filter UX only — integrated search/filter bar, bottom filter sheet, category/region/period/amount/saved-only controls, URL state, and policy-list filtering behavior.
- Approved direction: Visual Ralph B reference, 권역 그룹형 지역 선택, mixed apply model, close-to-discard draft changes.
- Removed copy: `필터 한 번에 설정`, `닫으면 변경은 취소되고, 적용하면 목록이 바뀌어요`, `임시 선택`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Frontend rules: `frontend/AGENTS.md`.
- Task spec: `.omx/specs/deep-interview-policies-filter-unified-ux-redesign.md`.
- Approved reference: `.omx/artifacts/visual-ralph/policies-filter-unified-ux-redesign/reference-b-final.html`.

## Latest Validation Evidence

- Typecheck: `npm --prefix frontend run typecheck` PASS.
- Targeted policies tests: `cd frontend && npm run test -- --run src/app/__tests__/policies.test.tsx` PASS (11 tests, mojibake check PASS).
- Full frontend tests: `cd frontend && npm run test` PASS (21 files, 201 tests).
- Production build: `cd frontend && npm run build` PASS (`index-BXK6FDaW.js`, `index-AX2Y-4lD.css`).
- Visual smoke: temporary Playwright smoke PASS; screenshots saved to `.omx/artifacts/visual-ralph/policies-filter-unified-ux-redesign/implemented-unified-filter-closed.png` and `implemented-unified-filter-sheet.png`.
- Frontend rebuild: `docker compose up -d --build frontend` PASS; frontend container restarted on `127.0.0.1:4173`.
- Served bundle check: `prototype-filter-sheet` present in built JS/CSS and forbidden helper copy absent from served JS.
- Diff hygiene: `git diff --check -- frontend/src/pages/PolicyPages.tsx frontend/src/styles/app.css frontend/src/app/__tests__/policies.test.tsx` PASS.

## Remaining Risks

- React Router v7 future-flag warnings still appear in existing test logs and are unrelated to this change.
- Region chips intentionally show all 17 fixed administrative regions even if current seed data has no matching policies; selecting an empty region can produce an empty result state.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
