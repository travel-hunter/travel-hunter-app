# Policy Benefit Detail Structure Implementation Plan

## Goal

Make policy detail support content readable when collected summaries contain mixed discount, period, condition, and notice information in one long sentence.

## Scope

- Frontend-only display structuring.
- No API contract change.
- No database schema change.
- Preserve existing policy detail actions and section order.

## Steps

1. Add a failing frontend test for a long collected benefit summary.
2. Add helper functions in `PolicyPages.tsx` to split and classify summary fragments.
3. Replace the old highlight-box meta paragraph with grouped support detail lists.
4. Add scoped CSS for grouped benefit content.
5. Run the policy detail test, full `App.test.tsx`, typecheck, diff check, and Docker rebuild/restart.

## Validation

- `cd frontend; npm test -- --run src/App.test.tsx -t "scannable detail groups"`
- `cd frontend; npm test -- --run src/App.test.tsx`
- `cd frontend; npm run typecheck`
- `git diff --check`
- `docker compose -f compose.yaml config --quiet`
- `docker compose -f compose.yaml build`
- `docker compose -f compose.yaml up -d --force-recreate`
- Runtime smoke for backend health and frontend HTTP 200.
