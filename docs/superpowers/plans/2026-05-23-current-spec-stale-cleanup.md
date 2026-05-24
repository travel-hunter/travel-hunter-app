# Current Spec Stale Cleanup Implementation Plan

## Goal

Bring the current work spec, API examples, frontend integration tests, and e2e smoke routes back in line with the post-dummy-policy runtime state.

## Scope

- Replace user-facing/runtime examples that still point to removed dummy policies with a real collected policy (`dgtour-밀양-1`).
- Keep legacy dummy slugs only where they are intentional deletion/audit fixtures.
- Make frontend tests independent from removed seed data by using current policy examples or explicit `AppDataApi` mocks.
- Record validation in `CHECKLIST.md`.

## Steps

1. Re-scan stale references in docs, evals, frontend tests, e2e tests, backend seed deletion code, and source audit tests.
2. Update `.agent/evals/api-contract-golden.json`, `docs/mvp-api-contract.md`, and frontend route smoke docs to use the current policy example.
3. Update `frontend/src/App.test.tsx` to stop navigating to `/policies/local-vacation` and to tolerate encoded Korean slugs in link assertions.
4. Update `frontend/e2e-backend/backend-mode.spec.ts` to use the same current policy route and official URL.
5. Update `docs/current-work-spec.md` and `docs/next-work-plan.md` with the current collection/dummy-removal/test state.
6. Run targeted frontend verification, JSON validation, stale-reference scan, typecheck, and diff checks.

## Remaining Risk

- Historical planning/spec documents may still mention old dummy policy names as history. They should be treated as archived context unless a later documentation pass rewrites old plan artifacts.
- Backend unit tests may still use dummy-like slugs as synthetic fixtures; keep them only if they do not imply runtime seed availability.
