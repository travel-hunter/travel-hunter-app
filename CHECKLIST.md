# CHECKLIST

## Current Status

- Active task: PR #99 user contact/OTP/notification settings pruning has been merged to `develop` and reflected on the development server.
- Git state: local `develop` and `origin/develop` are at merge commit `da425d5` (`Merge pull request #99 from travel-hunter/chore/prune-contact-notification-surfaces`).
- Development server: `/home/deploy/travelhunterapp` is on `develop` at `da425d5`; Docker images were rebuilt and the stack was restarted after Alembic migration.
- Next design prep: policy collection raw artifact externalization starter spec was added at `docs/specs/policy-source-artifact-externalization.md`.
- Removed surface: contact storage, phone verification, notification settings UI/API, SOLAPI webhook/runtime, and obsolete user profile/contact fields are removed from active runtime paths.
- Preserved surface: `preferredRegions` remains the canonical user regional preference; policy/trip/external-source `region` fields remain valid.
- Notification state: `notification_deliveries` remains as inert history only; scheduler/dispatch/webhook paths no longer produce provider calls or new delivery rows.

## Latest Validation Evidence

- Backend: `cd backend && .venv/bin/python -m pytest` passed (`483 passed, 1 warning`).
- Migrations: `cd backend && .venv/bin/alembic upgrade head --sql > /tmp/travel-hunter-alembic-upgrade-final.sql` passed; `0025_prune_contact_notify` drops the removed tables and user columns.
- Frontend: `cd frontend && npm run typecheck && npm test && npm run build` passed (`21` test files, `209` tests, production build OK).
- E2E: `cd frontend && npm run test:e2e` passed (`11 passed`).
- Compose/evals/static: `docker compose -f compose.yaml config`, `python3 -m json.tool .agent/evals/api-contract-golden.json`, `git diff --check`, and `git diff --check -- CHECKLIST.md` passed.
- Encoding/reference checks: UTF-8/U+FFFD scan over changed files passed; runtime source/current docs/eval removed-reference scan passed.
- Review gates: code review found no HIGH/MEDIUM blockers and 2 LOW doc drifts were corrected; architecture review is WATCH only for the intentional inert notification history shim.
- Local Docker smoke: `docker compose -f compose.yaml config`, `docker compose -f compose.yaml build`, `docker compose -f compose.yaml up -d db backend frontend`, `docker compose -f compose.yaml run --rm backend alembic upgrade head`, backend `/api/health`, frontend `/`, `alembic_version=0025_prune_contact_notify`, `users.preferred_regions` present, removed `users` columns absent, and removed tables `phone_verification_codes`/`user_notification_settings` absent all passed.
- CI repair: after PR #99 first CI run, `Frontend DB-backed fast lane` failed once in `trip-create.test.tsx` because the direct policy-region create test could click before the async preselected travel area finished enabling submit; the test now waits for the create button to be enabled. `cd frontend && npm test -- src/app/__tests__/trip-create.test.tsx` and `cd frontend && npm test` both passed after the fix.
- PR #99 GitHub gate: checks were green (`Frontend DB-backed fast lane`, `Backend fast lane`, CodeRabbit), review state had no requested changes, and PR #99 was merged with remote branch deletion.
- Development-server deploy: before destructive migration, DB backup was written on the server to `/home/deploy/travelhunter-db-backups/pre-pr99-contact-notification-prune-20260711T153508Z.dump`; server fast-forwarded to `da425d5`; `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config` and `build` passed without printing secrets.
- Development-server migration/stack: `alembic upgrade head` applied `0024_local_kst_time_shift` then `0025_prune_contact_notify`; `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d` left backend/db healthy and frontend running.
- Development-server smoke: `alembic_version=0025_prune_contact_notify`; `users.preferred_regions` present; removed `users` columns absent; `phone_verification_codes` and `user_notification_settings` absent; `/api/health` returned database connected; `/login`, `/policies`, `/policies/travelmonth-23`, `/trips`, and `/mypage` returned HTTP 200; backend log tail showed startup and health 200 only.
- Authenticated development-server browser smoke: Playwright Chromium login with the seeded dev account passed; `/api/me` worked in the browser session; `/mypage` hid removed phone/OTP/notification UI; profile save sent only canonical profile keys (`budget`, `preferredRegions`, `style`) and was restored; `/policies`, Gangjin policy detail separated condition/document/notice cards, policy save toggle restore, `/trips`, trip detail, friend invite viewer link preparation, and `/mypage` refresh all passed. Browser page errors were zero; only SPA/navigation and third-party aborted requests were ignored.

## Remaining Risks

- Downgrade is structural only and cannot restore dropped user/contact data after migration.
- Historical Alembic migrations, OMX logs/plans, and test fixtures still mention removed identifiers by design; active runtime source/current docs/eval references were checked separately.
- `notification_deliveries` table remains for inert history; future notification work must introduce a new explicit contract before re-enabling runtime delivery.
- Authenticated development-server browser smoke passed with the seeded dev account; OAuth provider smoke and real email delivery smoke remain outside this PR #99 contact/notification prune check.
- Policy collection raw artifact externalization is design-only; no runtime artifact store has been introduced yet.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
