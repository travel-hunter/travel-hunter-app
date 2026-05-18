# Travel Hunter Current Plan

## Current Phase

The MVP is DB-backed-only and runtime mock mode has been removed. Docker VPS direct staging artifacts and Cloudflare Tunnel staging artifacts exist. Trip status confirmation, trip place editing and drag-and-drop movement, mypage profile editing, AI recommendation-to-timeline, invite role persistence/enforcement, deadline notification preference/contact/delivery foundation, notification scheduler/provider/retry/webhook tracking, password reset, Kakao/Google OAuth entry points, button-audit UX fixes, production sourcemap hardening, PWA manifest/meta, project structure audit, Web Share API sharing fallback, implemented feature spec, draft autosave, signup email-check/nickname setup, Codex model split workflow scripts, MyPage applied policy count, policy-derived home destinations, and policy application CTA quality checks are complete. The current priority is FAQ/terms/privacy content polish in MyPage, followed by home destination ranking improvements or staging smoke work when actual env values are ready.

## Source Of Truth

- Current implementation spec: `docs/current-work-spec.md`
- Implemented feature spec: `docs/implemented-feature-spec.md`
- Notification delivery design: `docs/notification-delivery-plan.md`
- API contract: `docs/mvp-api-contract.md`
- Next priority: `docs/next-work-plan.md`
- Project structure audit: `docs/project-structure-audit.md`
- Draft autosave next scope: `docs/draft-autosave-next-scope.md`
- Release candidate handoff: `docs/release-candidate-handoff.md`
- Public VPS runbook: `docs/deployment-vps.md`
- Cloudflare Tunnel runbook: `docs/deployment-tunnel.md`
- Codex model workflow: `docs/codex-model-workflow.md`

## Guardrails

- Do not add `trips.slug`.
- Keep DB mode `Trip.id` as `str(trips.id)`.
- Keep `jeju-3-days` as legacy seed alias only.
- Keep API DTO fields `camelCase` and DB fields `snake_case`.
- Keep frontend pages behind the `AppDataApi` boundary.
- Keep backend routes thin and push business behavior into services.
- Do not reintroduce runtime mock mode.
- Do not commit real `.env` files, tunnel tokens, DB passwords, Kakao secrets, or auth secrets.

## Fast Lane Verification

```bash
cd frontend
npm run typecheck
npm test

cd ../backend
python -m pytest
```

Run only when a migration changes:

```bash
cd backend
alembic upgrade head --sql
```

## Release Gate

```bash
cd frontend
npm run test:e2e
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
```
