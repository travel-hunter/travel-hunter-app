# Travel Hunter Harness Checklist

## 기준 문서

- [x] `docs/current-work-spec.md` is the current implementation summary.
- [x] `docs/notification-delivery-plan.md` is the deadline notification delivery design.
- [x] `docs/release-candidate-handoff.md` is the MVP release-candidate handoff guide.
- [x] `docs/deployment-vps.md` is the public VPS staging runbook.
- [x] `docs/deployment-tunnel.md` is the Cloudflare Tunnel staging runbook.
- [x] `docs/mvp-api-contract.md` is the API contract.
- [x] `docs/next-work-plan.md` is the next-priority plan.
- [x] `docs/db-schema-v0.3.sql` is the ERD v0.3 SQL baseline.
- [x] `CONTRIBUTING.md` documents collaboration rules.

## 현재 구현 체크

- [x] Runtime mock mode removed.
- [x] MVP user flows implemented against FastAPI/PostgreSQL.
- [x] Itinerary detail place add/edit/delete is connected to `trip_places`.
- [x] Mypage profile editing is connected to `PATCH /api/me/profile`.
- [x] AI recommendation items can be added to a trip timeline through the place add API.
- [x] Invite role settings persist `viewer/editor` to `trip_invites.role` and invite acceptance writes the role to `trip_members.role`.
- [x] `viewer/editor` permissions are enforced for trip place editing.
- [x] Deadline notification preference persists to `user_notification_settings.deadline_enabled`.
- [x] Deadline notification delivery design is documented for Kakao AlimTalk and FastAPI internal scheduler.
- [x] Deadline notification contact persists to `users.phone_number`.
- [x] Notification delivery history foundation exists in `notification_deliveries`.
- [x] Wanted Design System import, component values, Button correction, and Toast correction documented.
- [x] Figma editable Current/Redesign frames exist for first-pass MVP routes.
- [x] Public VPS artifacts exist: `compose.vps.yaml`, `deploy/Caddyfile`, `deploy/.env.staging.example`.
- [x] Cloudflare Tunnel artifacts exist: `compose.tunnel.yaml`, `deploy/Caddyfile.tunnel`, `deploy/.env.tunnel.example`.

## 마지막 검증 결과

- Date: 2026-05-07.
- Backend pytest: 97 passed.
- Frontend typecheck: passed.
- Frontend build: passed.
- Alembic offline SQL: passed.
- Frontend `npm test`: blocked because Docker Desktop daemon was not running during compose PostgreSQL startup.
- Previous Frontend DB-backed Vitest: 28 passed.
- Previous DB-backed Playwright e2e: 5 passed.
- Local compose config/build: passed.
- VPS compose config: passed.
- Tunnel compose config: passed.
- `git diff --check`: passed for the latest notification contact foundation work.

## 다음 우선순위

- [x] Prepare deadline notification delivery implementation.
- [x] Add phone number storage and notification delivery history migration.
- [ ] Implement deadline notification target calculation service.
  - [ ] Calculate D-7/D-1 targets from `user_saved_policies` and `policies.end_date`.
  - [ ] Filter by `deadline_enabled`, `phone_number`, and `phone_verified_at`.
  - [ ] Reuse `notification_deliveries` unique key to avoid duplicate candidates.
- [ ] Resume Cloudflare Tunnel staging deployment when the feature pass pauses.
