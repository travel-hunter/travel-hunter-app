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
- [x] Itinerary detail place drag-and-drop reordering and cross-day movement is connected to `trip_places.order_num` and `trip_day_id`.
- [x] Mypage profile editing is connected to `PATCH /api/me/profile`.
- [x] AI recommendation items can be added to a trip timeline through the place add API.
- [x] Invite role settings persist `viewer/editor` and place editing permissions are enforced.
- [x] Deadline notification preference persists to `user_notification_settings.deadline_enabled`.
- [x] Deadline notification contact persists to `users.phone_number`.
- [x] Notification delivery history foundation exists in `notification_deliveries`.
- [x] Deadline notification target calculation service creates idempotent `pending/skipped` candidates.
- [x] FastAPI internal notification scheduler is connected through lifespan and gated by env.
- [x] SOLAPI Kakao AlimTalk provider adapter dispatches pending notification deliveries.
- [x] Notification retry policy resends retryable `failed` deliveries on later scheduler cycles.
- [x] SOLAPI webhook delivery status tracking reflects final provider reports in `notification_deliveries`.
- [x] Password reset request/confirm flow is connected to SMTP-backed reset links.
- [x] Kakao/Google OAuth authorization code flow is connected to login buttons.
- [x] Button audit fixes are applied for policy share, static policy documents, invite wording, and AI criteria sheet.
- [x] Web Share API sharing fallback is implemented for policy and invite links.
- [x] Draft autosave is implemented for trip creation, add-place, and edit-place sheets.
- [x] Draft autosave second-scope review is documented; place edit draft is the only next autosave candidate.
- [x] Production sourcemap is explicitly disabled and build output has no `.map` files.
- [x] PWA manifest/meta and app icons are provided.
- [x] PWA service worker/offline caching strategy is documented without enabling runtime caching.
- [x] Project structure audit is documented in `docs/project-structure-audit.md`.
- [x] Public VPS artifacts exist.
- [x] Cloudflare Tunnel artifacts exist.

## 마지막 검증 결과

- Date: 2026-05-07.
- Backend pytest: 164 passed.
- Alembic offline SQL: passed.
- Local compose config: passed.
- VPS compose config: passed.
- Tunnel compose config: passed.
- `git diff --check`: passed.
- Frontend typecheck/build: passed.
- Frontend build output includes PWA manifest/icons and no sourcemap files.
- Frontend DB-backed Vitest: 51 passed.
- Previous DB-backed Playwright e2e: 5 passed.
- Local compose config/build: passed.
- VPS compose config: passed.
- Tunnel compose config: passed.
- Password reset local preflight: unknown email returns `requested=true`; existing email without SMTP env fails with `503`.

## 다음 우선순위

- [x] Prepare deadline notification delivery implementation.
- [x] Add phone number storage and notification delivery history migration.
- [x] Implement deadline notification target calculation service.
- [x] Implement FastAPI internal notification scheduler.
- [x] Implement Kakao AlimTalk provider adapter.
- [x] Implement notification retry policy.
- [x] Implement SOLAPI webhook delivery status tracking.
- [x] Implement password reset and social login OAuth entry points.
- [x] Document password reset SMTP smoke runbook and local preflight.
- [x] Implement draft autosave for trip creation, add-place, and edit-place forms.
- [ ] Verify OAuth provider credentials and SMTP delivery in staging.
- [ ] Resume Cloudflare Tunnel staging deployment when the feature pass pauses.
