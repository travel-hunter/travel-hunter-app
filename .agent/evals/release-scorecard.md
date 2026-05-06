# Release Readiness Scorecard

Use this scorecard only for release-candidate handoff. It is not a daily feature-development gate.

## Scoring

| Dimension | Points | Evidence |
|---|---:|---|
| Feature completeness | 20 | Core auth, profile, policies, trips, recommendations, saved policies, and invite flows work for the current MVP phase |
| API/data contract quality | 20 | `docs/mvp-api-contract.md`, frontend types, backend schemas, and focused tests agree |
| UI/UX usability | 15 | Public/protected/authenticated routes render, responsive widths are stable, no prototype copy remains |
| Code structure and maintainability | 15 | Frontend uses API boundary; backend keeps route/schema/service/repository separation |
| Validation system | 15 | Fast lane checks pass; release-gate e2e/build/compose checks are run before handoff |
| Documentation | 10 | README/env docs/current plan/checklist explain setup, behavior, and remaining scope |
| Release readiness | 5 | No known release blockers for the release candidate |

Total: 100

## Required Release Evidence

- `cd frontend && npm run typecheck`
- `cd frontend && npm test`
- `cd frontend && npm run test:e2e`
- `cd frontend && npm run test:e2e:backend`
- `cd frontend && npm run build`
- `cd backend && python -m pytest`
- `cd backend && alembic upgrade head --sql`
- `docker compose -f compose.yaml config`
- `docker compose -f compose.yaml build`

## Daily Fast Lane

Feature work only requires:

- `cd frontend && npm run typecheck`
- `cd frontend && npm test`
- `cd backend && python -m pytest`

Run `alembic upgrade head --sql` only when migrations change.

## Blocker Handling

- Docker Desktop unavailable is not a daily feature blocker.
- Docker-backed checks must pass before declaring a release candidate ready.
