# Release Readiness Scorecard

Use this scorecard when applying `.agent/skills/qa-release-readiness/SKILL.md`.

## Scoring

| Dimension | Points | Evidence |
|---|---:|---|
| Feature completeness | 20 | Core auth, profile, policies, trips, recommendations, and invite flows work for the current MVP phase |
| API/data contract quality | 20 | `docs/mvp-api-contract.md`, frontend types, backend schemas, tests, and evals agree |
| UI/UX usability | 15 | Public/protected/authenticated routes render, responsive widths are stable, no prototype copy remains |
| Code structure and maintainability | 15 | Frontend uses API boundary; backend keeps route/schema/service/data separation |
| Validation system | 15 | Frontend typecheck/test/e2e/build, backend pytest, and compose config are available and pass or blockers are recorded |
| Documentation | 10 | README/env docs/current plan/checklist explain setup, behavior, and remaining scope |
| Release readiness | 5 | No known release blockers for the current MVP phase |

Total: 100

## Required Output Format

1. Total score.
2. Score by dimension with file or command evidence.
3. Release blockers.
4. Nice-to-have issues.
5. Ready or not-ready judgment.
6. Additional verification recommended.

## Minimum Bar

- 85 or higher: ready for the current MVP phase if no P0/P1 blocker remains.
- 70 to 84: close, but fix listed blockers before release.
- Below 70: not ready.

## Required Release Evidence

- `cd backend && python -m pytest`
- `cd backend && alembic upgrade head --sql`
- `docker compose -f compose.yaml config`
- `docker compose -f compose.yaml build`
- `cd frontend && npm run typecheck`
- `cd frontend && npm test`
- `cd frontend && npm run test:e2e`
- `cd frontend && npm run test:e2e:backend`
- `cd frontend && npm run build`

## Current Known Blocker Handling

- If Docker Desktop is unavailable locally, record compose build and backend-mode e2e as blocked rather than passed.
- If the full `BACKEND_DATA_SOURCE=db` pytest suite cannot reach PostgreSQL, run targeted DB-mode service/route tests and record the full DB suite as pending.

## Current Assessment

Date: 2026-05-06

Score: 88 / 100

Judgment: not ready to declare staging-ready until Docker-backed validation reruns successfully.

Passed evidence:

- `cd backend && python -m pytest`: 62 passed
- `cd backend && alembic upgrade head --sql`: passed
- `docker compose -f compose.yaml config`: passed
- `cd frontend && npm run typecheck`: passed
- `cd frontend && npm test`: 9 passed
- `cd frontend && npm run test:e2e`: 6 passed
- `cd frontend && npm run build`: passed
- `.agent/evals/api-contract-golden.json` JSON parse: passed
- `git diff --check`: passed

Blocked evidence:

- `cd frontend && npm run test:e2e:backend`: blocked because Docker Desktop daemon is unavailable.
- `docker compose -f compose.yaml build`: blocked because Docker Desktop daemon is unavailable.
- Compose DB runtime migration/seed validation: blocked for the same Docker daemon reason.
