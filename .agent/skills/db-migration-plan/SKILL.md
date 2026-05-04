name: db-migration-plan
description: Use before introducing PostgreSQL, SQLAlchemy models, Alembic migrations, or DB-backed repositories.

# Goal

Convert the ERD v0.3 decision into a safe persistence implementation without breaking the existing API contract.

# When To Use

- Adding SQLAlchemy.
- Adding Alembic.
- Replacing Mock services with repositories.
- Connecting FastAPI to PostgreSQL.
- Changing DB schema or migration strategy.

# Required Sources

- `../files/travel_hunter_schema_v0.3.sql`
- `../files/ERD_v0.3_결정안건_상세분석.md`
- `docs/mvp-api-contract.md`
- `docs/current-work-spec.md`
- `.agent/evals/erd-api-mapping.md`

# Procedure

1. Compare ERD v0.3 SQL with the API contract field mapping.
2. Decide migration order before editing models.
3. Define repository/service boundaries that preserve current Mock API response shapes.
4. Plan seed data migration for current fixture-like policies, trips, users, invites, and recommendations.
5. Define rollback expectations and local setup commands.
6. Update docs and env examples before calling the migration work complete.

# Acceptance Criteria

- API DTOs remain stable unless an explicit contract update is made.
- DB fields stay `snake_case`; API fields stay `camelCase`.
- `policies.slug`, `trip_invites`, `users.preferred_regions`, and `trip_*` prefix decisions are preserved.
- Existing frontend smoke flows continue to run against `VITE_DATA_SOURCE=backend`.
