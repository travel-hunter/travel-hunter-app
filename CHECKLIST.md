# CHECKLIST

## Current Status

- Active task: Policy collection cleanup dev deployment verification via `$ultragoal` is in final evidence/quality-gate stage.
- Local branch: `develop@6e00928`, fast-forwarded from merged PR #93.
- Remote: `origin/develop@6e00928`; cleanup commits `3fa274e`, `2b1c93c`, and `7c97c66` are ancestors of `origin/develop`.
- Development server: `deploy@192.168.32.15:/home/deploy/travelhunterapp` on clean `develop@6e00928` after `git pull --ff-only origin develop`.
- Runtime: `compose.tunnel.yaml` stack rebuilt and running; `db` and `backend` healthy, `frontend`, `caddy`, and `cloudflared` running.
- Scope boundary: no production-domain mutation, destructive DB reset/downgrade, secret/env value printing, object-storage implementation, or raw/source-record deletion was performed.

## Latest Validation Evidence

- PR path: direct `git push origin develop` was rejected by GitHub GH013 PR-only repository rule; branch `codex/policy-cleanup-dev-deploy-20260703` was pushed and PR #93 was merged into `develop` with merge commit `6e00928`.
- Server update: dev server was clean on `develop@a6140e2`, fetched `origin/develop@6e00928`, and fast-forwarded to `6e00928`.
- Compose validation: `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config --quiet` PASS without printing env values.
- Build/start: backend and frontend images built; frontend build ran `npm run typecheck && vite build`; `docker compose ... up -d` recreated `db`, `backend`, and `frontend` while `caddy` and `cloudflared` stayed running.
- Migration: non-destructive `alembic upgrade head` PASS, including `0022_signup_terms_agreements -> 0023_policy_structured_detail`.
- Public smoke: `https://dev.travel-hunter.co.kr/api/health` returned `status=ok`, `environment=staging`, `database=connected`; `/` and `/login` returned HTTP 200 HTML.
- Policy regeneration: existing dev `external_source_records` were non-destructively re-promoted with `promote_external_benefits_to_policies`; result `promoted_count=7`.
- 강진 API: `GET /api/policies/travelmonth-23` now returns `structuredDetail.conditions` with 관광지 방문/Chak 결제/app usage, `documents` with `거래내역(영수증)`, `notices` with `홈페이지 공지사항(고시공고) 필독`, and no invented 디지털관광주민증 helper.
- 강진 browser: authenticated Playwright smoke using the dev seed account opened `/policies/travelmonth-23` and verified title, `혜택 적용 조건`, `필요 서류`, `확인 필요 사항`, visit/payment/document/notice text, and absence of the wrong helper sentence.
- Sample policies: sampled `travelmonth-20`, `travelmonth-24`, and `travelmonth-26`; all avoided the wrong 디지털관광주민증 helper and showed no severe condition/document/notice card mixing.
- Logs: backend/caddy log tail grep showed no traceback/fatal/error; cloudflared showed older QUIC/stream ERR/WRN entries only, treated as non-blocking because current public routes are healthy.
- CI follow-up: PR #93 frontend DB-backed lane failed because seed invite `jeju-3d` expired at `2026-06-30T23:59:59Z`; the seed expiry was extended to `2026-12-31T23:59:59Z` and local DB-backed `npm run typecheck && npm test` now passes.
- Backend regression: `backend/.venv/bin/python -m pytest` PASS (`534 passed, 1 warning`).
- Ultragoal evidence: `.omx/ultragoal/ledger.jsonl` records completed G001, G008, G009, G003, G004, G005, and G006; G002 direct-push failure is superseded by the PR-path replacement goals.

## Remaining Risks

- A CI repair PR is required after PR #93 because GitHub branch protection rejected direct `develop` pushes; merge and re-deploy the seed-expiry fix before final ultragoal completion.
- `stash@{0}` preserves pre-existing `CHECKLIST.md` admin-promotion notes from before this deployment run; it was not reapplied to avoid mixing unrelated evidence into this deploy scope.
- Some sampled local-half-trip policies still have source-specific edge wording, so future parser/normalizer fixture work may be needed if operators want stricter document/notice classification.
- Cloudflared has historical QUIC/stream warnings; public tunnel smoke is healthy, but tunnel logs should be monitored if route availability changes.
- Production domain `travel-hunter.co.kr`, object storage/raw artifact externalization, new policy sources, and admin UI redesign remain out of scope.

## Cleanup Policy

- Keep this file slim: current status, latest validation evidence, active remaining risks only.
- Do not append long historical logs; replace stale validation detail as new gates run.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no U+FFFD replacement characters.
