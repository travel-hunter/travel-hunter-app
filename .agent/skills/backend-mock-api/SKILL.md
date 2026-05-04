name: backend-mock-api
description: Use when changing FastAPI Mock API behavior before PostgreSQL persistence exists.

# Goal

Keep the Mock API deterministic, contract-compatible, and easy to replace with DB-backed services later.

# When To Use

- Adding or changing FastAPI endpoints.
- Changing mock auth, profile, policy, trip, recommendation, or invite behavior.
- Changing seed data served by the backend.

# Rules

- Routes stay thin.
- Pydantic schemas live in `app/schemas`.
- Business behavior lives in `app/services`.
- Seed/mock data lives in `app/data`.
- Public responses must match `docs/mvp-api-contract.md`.
- Do not add SQLAlchemy, Alembic, or database calls under this skill.

# Procedure

1. Confirm the endpoint contract in `docs/mvp-api-contract.md`.
2. Update schema, service, route, and seed data together.
3. Add or update `TestClient` coverage.
4. Update `.agent/evals/api-contract-golden.json` and `.agent/evals/backend-endpoint-smoke.md`.
5. Run `python -m pytest`.

# Acceptance Criteria

- Happy path is covered.
- Important not-found or invalid input behavior is covered when behavior changes.
- Frontend contract consumers do not require direct seed-data knowledge.
