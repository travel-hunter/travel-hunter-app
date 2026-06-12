# CHECKLIST

## Current Status

- Latest validated scope: development-server release candidate readiness and operating-server handoff preparation. Production/operating-server deployment is outside the current Codex execution scope and belongs to the operating-transition owner.
- Last validation date: 2026-06-12.
- Current release posture: development server branch `codex/production-promotion-20260612` at `b4be808779bd541b048a49487e768631cce834a3` is deployed; PR head `a53c122e8ad8c0925d249e3e60500d03ef7fd5ca` adds documentation/evidence only. Public/API/auth/trip/policy/invite/Kakao Maps, admin ops, SMTP send-trigger and inbox receipt, real Google/Kakao OAuth callback/session smoke, and Docker default-bridge/build DNS fix verification passed. Release-gate preflight found and fixed frontend audit/e2e drift, then PR #52 opened the protected-branch path toward `main` for the operating-transition owner to consume after review/merge.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source-specific docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and linked deployment guides, especially `docs/deployment-cicd/dev-deployment-architecture.md`, `docs/deployment-cicd/09-release-checklist.md`, and `docs/deployment-cicd/dev-rc-handoff.md`.
- Dev-server deploy/smoke planning: `.omx/specs/deep-interview-dev-server-ready-prep.md`, `.omx/plans/prd-dev-server-deploy-smoke-20260611.md`, `.omx/plans/test-spec-dev-server-deploy-smoke-20260611.md`, `.omx/plans/ralplan-dev-server-deploy-smoke-20260612-addendum.md`, `.omx/plans/ralplan-consensus-dev-server-deploy-smoke-20260612.json`.
- Latest deploy/runtime evidence: `.omx/evidence/dev-server-runtime-deploy-20260612.md`, `.omx/evidence/dev-server-runtime-gates-20260612.md`, `.omx/evidence/docker-dns-diagnosis-20260612.md`, `.omx/evidence/docker-dns-fix-20260612.md`, `.omx/evidence/production-preflight-20260612.md`.

## Latest Validations

- 2026-06-12 development-server deploy baseline passed: SSH key auth to `deploy@192.168.32.15`; repo at `/home/deploy/travel-hunter-app`; `deploy/.env.prod` present with chmod `600`; compose config/build/up and Alembic migration passed; db/backend healthy and frontend/caddy/cloudflared running. Build used a build-only host-network DNS workaround because default Docker bridge DNS could not resolve `pypi.org`.
- 2026-06-12 public and authenticated smoke passed: `/api/health`, public API endpoints, SPA routes, auth, policy save/detail, trip create/list/detail, trip-policy links, applied-policy links, cleanup, trip edit revision advancement, and stale revision 409 conflict all returned expected results.
- 2026-06-12 integration smoke passed where fully automatable: Kakao Local candidate recommendations, invite link/accept without email delivery, Kakao Maps browser rendering, and Google/Kakao OAuth-start redirects all matched expected runtime behavior.
- 2026-06-12 remaining runtime gate automation passed: temporary app-internal admin setup and cleanup, admin external-collection health/quality/run, password-reset SMTP send request, invite SMTP send request, and Google/Kakao OAuth-start redirect checks passed. The configured Gmail test mailbox received both password-reset and invite emails.
- 2026-06-12 real provider OAuth callback smoke passed: user browser login succeeded for Google and Kakao; backend logs showed each provider callback returning `302`, followed by `POST /api/auth/refresh` `200 OK` and authenticated `/api/me/*` reads returning `200 OK`.
- 2026-06-12 docs/evidence hygiene passed: `git diff --check`, UTF-8 decode/no `U+FFFD`, and changed-doc secret-shape scan passed for the checklist, release checklist, and runtime-gates evidence.
- 2026-06-12 Docker DNS diagnosis completed: default bridge DNS failure was isolated to inherited WSL resolver behavior; explicit `8.8.8.8`, compose network, and host network resolution worked. Evidence: `.omx/evidence/docker-dns-diagnosis-20260612.md`.
- 2026-06-12 Docker DNS root fix completed on the development server: daemon DNS override was applied, Docker was restarted, compose services were restored healthy, default-bridge DNS passed for package registries, and a BuildKit DNS probe passed. Evidence: `.omx/evidence/docker-dns-fix-20260612.md`.
- 2026-06-12 scope correction confirmed: the current target is not direct production deployment, but a development-server release candidate that an operating-transition owner will sync to production. The previous production work spec remains historical preflight context, not current execution authority.
- 2026-06-12 release-gate preflight passed for operating handoff: backend `pytest` (`455 passed, 1 warning`), Alembic SQL generation, frontend `npm audit --audit-level=high`, `npm run typecheck`, `npm run test:mojibake`, `npm test` (`18 files`, `162 tests`), `npm run test:e2e` (`10 passed`), `npm run build`, remote `docker compose -f compose.yaml config`, remote `docker compose --env-file ... -f compose.tunnel.yaml config`, and dummy-env `compose.tunnel.yaml` Docker image build.
- 2026-06-12 frontend release gate fixed: lockfile security updates cleared high/critical npm audit findings, and backend-mode e2e now uses the current seeded policy slug plus current generated itinerary time slots.
- 2026-06-12 GitHub promotion path opened because protected branches reject direct pushes: draft PR #52 (`codex/production-promotion-20260612` -> `main`) created, and CI passed (`Frontend DB-backed fast lane`, `Backend fast lane`, CodeRabbit). Main promotion still needs PR review/merge.
- 2026-06-12 development-server RC handoff docs updated: `docs/deployment-cicd/dev-rc-handoff.md` records the separated dev/prod ownership model, required production env keys without values, Cloudflare/OAuth/Brevo/Kakao setup expectations, operating-server smoke checklist, and no-go lines.
- 2026-06-12 development deployment architecture/runbook documented: `docs/deployment-cicd/dev-deployment-architecture.md` explains the dev server Cloudflare Tunnel -> Caddy -> frontend/backend routing, Docker build inputs, deploy/smoke/rollback commands, and production handoff boundary using the role term `운영 전환 담당자` without recording secrets.
- 2026-06-12 development deployment docs validation passed: `git diff --check` for changed docs, UTF-8 decode/no `U+FFFD`, changed-doc secret-shape scan, independent `code-reviewer` APPROVE, and independent `architect` CLEAR all passed.
- 2026-06-12 `/trips` list participation display fix validated: local `cd frontend && npm run typecheck`, `cd frontend && npm run build`, `cd frontend && npm run test:mojibake`, and `cd frontend && npx vitest run src/components/cards.test.tsx` passed. Local DB-backed route wrapper could not start because this WSL distro lacks `docker`, but PR #52 CI passed `Backend fast lane` and `Frontend DB-backed fast lane` for commit `892125f` before the checklist evidence update.
- 2026-06-12 development-server `/trips` participation display fix deployed and smoked: `/home/deploy/travel-hunter-app` moved from `09f3a4d` to `b4be808`, frontend image rebuilt and restarted through `compose.tunnel.yaml`, `/api/health` returned connected, and a temporary invite-accept smoke showed API `participantCount=1` with `people.length=2` while `https://dev.travel-hunter.co.kr/trips` rendered `👥 2명 참여`; smoke trip `9` was deleted.

## Remaining Risks

- Operating-server deployment is not performed by Codex in the current scope; the operating-transition owner must sync the approved `main` SHA and run production smoke.
- Production DNS for `travel-hunter.co.kr` and `api.travel-hunter.co.kr` was unresolved during preflight and must be handled by the operating-transition owner if those hostnames are used.
- Existing dev runtime env has required secret keys, but domain/redirect values are dev-domain scoped; operating-server env must use production-domain values and a production-confirmed Cloudflare tunnel/token before stack start.
- Main promotion is not merged yet because GitHub branch protection requires PR review/merge; direct push to `develop` was rejected by repository rules.
- Production stack deploy and public production smoke have not been executed in this Codex scope.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
