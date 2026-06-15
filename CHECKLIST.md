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

- 2026-06-15 email-first signup full regression prep: `cd backend && .venv/bin/python -m pytest` passed (`226 passed`, `1 warning`).
- 2026-06-15 email-first signup full regression prep: `cd frontend && npm test` passed (`87 passed`); `cd frontend && npm run typecheck && npm run build` passed; `cd frontend && npm run test:e2e` passed (`5 passed`).
- 2026-06-15 email-first signup full regression prep: `cd backend && .venv/bin/alembic upgrade head --sql` generated successfully; `docker compose -f compose.yaml config` passed; `git diff --check`, `.agent/evals/api-contract-golden.json` JSON parse, and changed-file UTF-8 replacement-character scan passed.
- 2026-06-15 email-first signup flow: `cd frontend && npx vitest run src/App.test.tsx -t "signup"` passed (`3 passed`, `76 skipped`).
- 2026-06-15 email-first signup flow: `python3 -m json.tool .agent/evals/api-contract-golden.json >/dev/null`, `git diff --check`, and changed-file UTF-8 replacement-character scan passed.
- 2026-06-15 public dev smoke: synced source to `deploy@192.168.32.15`, Docker backend/frontend build passed, services restarted, `/api/health` returned ok/connected, public `POST /api/auth/signup` for `young940816@nate.com` returned `verificationRequired=true`, and user confirmed real-inbox signup → onboarding/nickname setup completed.
- 2026-06-15 migration risk cleanup: restored repo Alembic continuity with compatibility revisions `0018_add_trip_revision` and `0019_email_first_signup`; local `alembic upgrade head` moved `0018_add_trip_revision` → `0019_email_first_signup (head)` and `alembic upgrade head --sql` generated successfully.
- 2026-06-15 migration risk cleanup: remote backend image rebuilt, remote DB upgraded to `0019_email_first_signup (head)`, internal OpenAPI exposes `/api/auth/signup`, `/api/auth/signup/verify`, `/api/auth/signup/complete`, and `pending_signups` columns are `id,email,token_hash,created_at,expires_at` with `password_hash` absent.
- 2026-06-15 minimal regression: `cd backend && .venv/bin/python -m pytest tests/test_auth_db_service.py tests/test_auth_db_routes.py tests/test_db_schema.py -q` passed (`30 passed`, `1 warning`); `cd frontend && npm run typecheck` passed.

## 남은 우선순위

- [x] Run broader frontend/backend regression before merging.
- [ ] Smoke test real OAuth provider callbacks in staging because local tests mock provider handoff.
- [ ] Rotate exposed staging/dev secrets that appeared in terminal output during risk cleanup: DB password, auth secret, OAuth secrets, SMTP key, and Cloudflare tunnel token.

## 주의사항

- Historical validation logs and older runbook details are intentionally kept only in Git history.
- This change touches runtime auth behavior; full local regression now passes, but real OAuth provider callback smoke remains a staging follow-up.
- Local duplicate `cloudflared` connector was stopped so the public dev hostname routes to the updated remote dev server instead of a stale local connector.
- Public dev DB had historical revision `0018_add_trip_revision`; the repo now includes a compatibility marker plus `0019_email_first_signup` so Alembic can continue without manual stamping.
- A compose config command printed staging/dev secrets in terminal output during this session; rotate those credentials before treating the environment as secure.
