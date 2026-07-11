# CHECKLIST

## Current Status

- Active task: user contact/OTP/notification settings pruning is implemented across backend, frontend, schema references, docs, evals, and tests.
- Git state: local implementation commit `8d0c831` was pushed through PR branch `chore/prune-contact-notification-surfaces`; direct `develop` push is blocked by repository rules, so PR #99 targets `develop`.
- Deployment prep: development-server handoff checklist was added at `docs/deployment-cicd/user-contact-notification-prune-dev-deploy-checklist.md`.
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

## Remaining Risks

- Downgrade is structural only and cannot restore dropped user/contact data after migration.
- Historical Alembic migrations, OMX logs/plans, and test fixtures still mention removed identifiers by design; active runtime source/current docs/eval references were checked separately.
- `notification_deliveries` table remains for inert history; future notification work must introduce a new explicit contract before re-enabling runtime delivery.
- Development-server application still requires PR #99 merge, protected-branch CI/review gates, and destructive-migration backup/smoke execution.
- Policy collection raw artifact externalization is design-only; no runtime artifact store has been introduced yet.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
