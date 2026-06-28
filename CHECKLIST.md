# CHECKLIST

## Current Status

- Active task: current dirty worktree has been reflected to the remote dev domain for review.
- Branch: `develop`; push, PR creation, and merge have not been performed.
- Note: existing uncommitted UI/participant-count work and the earlier trip-detail preview-copy cleanup remain intentionally preserved.

## Local Work Summary

- `/friend-invite?tripId=...` now renders two role-specific invite cards: `보기만 가능` and `함께 편집`.
- `GET /api/trips/{tripId}/invite` returns `InviteLinksState` with `viewer` and `editor` invite states.
- Backend invite lookup/creation is role-aware: same-role active invite is reused; the other role's token/role is not mutated.
- Email invite sends the selected role's dedicated link and shows role-specific fallback copy when SMTP is unavailable.
- Existing participant-count work remains: `/trips` uses actual `Trip.people`, `/trips/new` omits planned party size, and invite acceptance caps actual participants at 10.
- API docs, workflow spec, implemented-feature notes, DB schema notes, and `.agent/evals/api-contract-golden.json` were updated for role-specific invite links.

## Latest Validation Evidence

- Remote dev deploy: synced modified tracked files to `deploy@192.168.32.15:/home/deploy/travel-hunter-app`, backed up pre-sync server state at `/home/deploy/.travel-hunter-recovery/20260628T093539Z`, rebuilt `backend`/`frontend`, ran `alembic upgrade head`, and restarted tunnel compose services.
- Remote dev smoke: `https://dev.travel-hunter.co.kr/api/health` returned `{"status":"ok","service":"travel-hunter-backend","environment":"staging","database":"connected"}`; `/`, `/login`, `/policies`, `/trips`, `/mypage`, and `/friend-invite` returned HTTP 200 over HTTPS.
- Backend targeted invite/trip tests: `cd backend && .venv/bin/python -m pytest tests/test_trip_db_service.py tests/test_trip_db_routes.py tests/test_invite_db_routes.py tests/test_trip_auth_edge_cases.py` PASS (119 tests, 1 warning).
- Frontend invite tests: `npm --prefix frontend test -- invite-oauth.test.tsx` PASS (22 tests); mojibake check PASS.
- Frontend trip detail regression tests: `npm --prefix frontend test -- trip-detail.test.tsx` PASS (31 tests); mojibake check PASS.
- Frontend typecheck/build: `npm --prefix frontend run typecheck` PASS; `npm --prefix frontend run build` PASS.
- Contract/hygiene: `.agent/evals/api-contract-golden.json` parses; `git diff --check` PASS; changed files are UTF-8 readable and contain no U+FFFD.

## PR Prep Next Steps

1. Keep the recommended commit split unless the final review suggests otherwise:
   - trip detail recommendation preview/save/reorder/button UX,
   - new trip creation flow,
   - shared gutter + red/coral/emoji visual polish,
   - actual participants + role-specific invite links.
2. Push only after explicit user approval.

## Remaining Risks

- Full backend suite, full frontend suite, and full Playwright e2e were not rerun after the role-specific invite link change.
- Live browser visual screenshots for the new two-card invite UI were not captured in this pass.
- No DB migration was added because existing `trip_invites.role` is sufficient for role-specific active invite coexistence.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, PR prep instructions, and active risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
