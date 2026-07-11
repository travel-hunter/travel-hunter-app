# CHECKLIST

## Current Status

- Active task: user contact/OTP/notification settings pruning is implemented across backend, frontend, schema references, docs, evals, and tests.
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

## Remaining Risks

- Downgrade is structural only and cannot restore dropped user/contact data after migration.
- Historical Alembic migrations, OMX logs/plans, and test fixtures still mention removed identifiers by design; active runtime source/current docs/eval references were checked separately.
- `notification_deliveries` table remains for inert history; future notification work must introduce a new explicit contract before re-enabling runtime delivery.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
