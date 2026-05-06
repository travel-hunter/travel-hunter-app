# Travel Hunter Harness Checklist

## 기준 문서

- [x] `docs/current-work-spec.md` is the current implementation summary.
- [x] `docs/release-candidate-handoff.md` is the MVP release-candidate handoff guide.
- [x] `docs/deployment-vps.md` is the public VPS staging runbook.
- [x] `docs/deployment-tunnel.md` is the Cloudflare Tunnel staging runbook.
- [x] `docs/mvp-api-contract.md` is the API contract.
- [x] `docs/next-work-plan.md` is the next-priority plan.
- [x] `docs/db-schema-v0.3.sql` is the ERD v0.3 SQL baseline.
- [x] `docs/future-deployment.md` preserves later deployment expansion notes.
- [x] `CONTRIBUTING.md` documents collaboration rules.

## 현재 구현 체크

- [x] Runtime mock mode removed.
- [x] MVP user flows implemented against FastAPI/PostgreSQL.
- [x] Wanted Design System import, component values, Button correction, and Toast correction documented.
- [x] Figma editable Current/Redesign frames exist for first-pass MVP routes.
- [x] Public VPS artifacts exist: `compose.vps.yaml`, `deploy/Caddyfile`, `deploy/.env.staging.example`.
- [x] Cloudflare Tunnel artifacts exist: `compose.tunnel.yaml`, `deploy/Caddyfile.tunnel`, `deploy/.env.tunnel.example`.

## 마지막 검증 결과

- Date: 2026-05-06.
- Backend pytest: 72 passed.
- Frontend DB-backed Vitest: 20 passed.
- DB-backed Playwright e2e: 5 passed.
- Frontend build: passed.
- Alembic offline SQL: passed.
- Local compose config/build: passed.
- VPS compose config: passed.
- Tunnel compose config: passed.
- `git diff --check`: passed for the latest tunnel artifact work.

## 다음 우선순위

- [ ] Provide Cloudflare domain/tunnel token, repo clone access, and real tunnel env values.
- [ ] Execute Cloudflare Tunnel staging deployment from the current RC baseline.
- [ ] Run the internal-test smoke checklist on the external staging URL.
- [ ] Record staging URL, commit, validation result, and blockers.
- [ ] Define public-test operations basics: privacy/terms, backup, logs, monitoring, incident response.
- [ ] Add Jenkins automation later, after manual tunnel staging is proven.
