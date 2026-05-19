# Travel Hunter Harness Checklist

## 현재 기준 문서

- [x] Product/current state: `docs/current-work-spec.md`
- [x] Implemented behavior: `docs/implemented-feature-spec.md`
- [x] API contract: `docs/mvp-api-contract.md`
- [x] DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`
- [x] Local runtime: `docs/local-dev-runtime.md`
- [x] Deployment/CICD: `docs/deployment-cicd/README.md`
- [x] Next priority: `docs/next-work-plan.md`
- [x] Collaboration rules: `CONTRIBUTING.md`, `AGENTS.md`

## 현재 보장 조건

- [x] Runtime mock API mode is removed; frontend data access goes through `AppDataApi`.
- [x] User-facing backend behavior is PostgreSQL-backed.
- [x] Policy detail routes use `policySlug` / `policies.slug`.
- [x] Trip routes use internal trip ids; public trip slugs are not introduced.
- [x] API DTO fields stay `camelCase`; DB and SQL fields stay `snake_case`.
- [x] Backend route/schema/service/repository boundaries remain the implementation pattern.
- [x] Schema changes are managed by Alembic, not SQLAlchemy `create_all()`.
- [x] Real `.env` files, DB passwords, OAuth secrets, auth secrets, tunnel tokens, and Docker image archives are not committed.
- [x] Cloudflare Tunnel is the current deployment baseline; Jenkins is still a planned CD path.
- [x] Release readiness criteria live in `docs/deployment-cicd/09-release-checklist.md`.
- [x] `.agent/evals/api-contract-golden.json` remains the machine-readable API contract eval.

## 최근 검증

- 2026-05-19 DB schema docs: `git diff --check`, stale schema-reference search, `python -m pytest tests/test_db_schema.py`, `alembic upgrade head --sql`, and `alembic current` passed.
- 2026-05-19 docs core cleanup: stale deleted-doc reference search and `git diff --check` passed.
- 2026-05-19 backend docs cleanup: stale backend doc/eval reference search and `git diff --check` passed.
- 2026-05-19 frontend docs cleanup: stale frontend README/eval reference search and `git diff --check` passed.
- 2026-05-19 AI docs cleanup: AI/Codex guidance is consolidated in `docs/deployment-cicd/06-ai-workflow.md`; reference search and `git diff --check` passed.
- 2026-05-19 remaining docs cleanup: `CHECKLIST.md`, `PLANS.md`, `README.md`, `.agent` release readiness docs, and release checklist were compacted; removed-doc reference search, `.agent/evals` listing, and `git diff --check` passed.
- 2026-05-19 final verification: frontend `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` passed after updating stale e2e expectations to the current policy CTA, invite, logout, and trip creation flows; backend `python -m pytest tests/test_db_schema.py`, `python -m pytest`, `alembic upgrade head --sql`, compose config checks, and `docker compose -f compose.yaml build` passed.

## 남은 우선순위

- [ ] Let the `feat/prototype-to-react` to `develop` PR run GitHub Actions and fix any check failure on the same branch.
- [ ] Request review and prepare merge into `develop`.
- [ ] Verify SMTP delivery in staging.
- [ ] Verify OAuth provider credentials in staging.
- [ ] Resume Cloudflare Tunnel staging deployment when actual env values are ready.

## 주의사항

- Historical validation logs, prototype notes, and VPS-era runbook details are intentionally kept only in Git history.
- Documentation-only cleanup does not require frontend/backend test suites unless a code, API, schema, or runtime behavior changes.
- For release handoff, run the release gate in `docs/deployment-cicd/09-release-checklist.md` and record only the final evidence here, in the PR, or in the handoff note.
