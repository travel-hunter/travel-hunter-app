# Travel Hunter Agent Harness

This directory contains reusable operating instructions and evaluation artifacts for AI agents and human contributors.

## How To Use

1. Read `../AGENTS.md`.
2. Read the nearest nested `AGENTS.md` for the area being changed.
3. Read `../PLANS.md`.
4. Pick the relevant skill from `.agent/skills`.
5. Check `.agent/evals` before and after implementation.
6. Record validation results and remaining risks in `../CHECKLIST.md` when project state changes.

## Skills

- `repo-orientation`: use before non-trivial work.
- `api-contract-sync`: use whenever API request/response shapes change.
- `frontend-route-ui`: use for React route, page, and UI work.
- `backend-mock-api`: use for FastAPI Mock API changes before DB persistence.
- `db-migration-plan`: use before PostgreSQL, SQLAlchemy, or Alembic work.
- `qa-release-readiness`: use before handoff or release readiness review.

## Evals

- `api-contract-golden.json`: required endpoint fields and example shapes.
- `frontend-route-smoke.md`: route and responsive smoke criteria.
- `backend-endpoint-smoke.md`: backend endpoint expectations.
- `erd-api-mapping.md`: ERD v0.3 to API mapping notes.
- `release-scorecard.md`: weighted release readiness scorecard.
