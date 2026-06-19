# CHECKLIST

## Current Status

- Latest implemented scope: `/trips/:tripId` 추천 일정 저장 전 미리보기 상단 액션을 **취소**와 **전체 저장** 두 개로 단순화했다.
- Top cancel label update: 저장 전 미리보기 상단의 전체 후보 제거 버튼 문구는 **취소**로 표시한다.
- Removed top bulk-add labels/flows: **기존 유지하고 추가**, **추천 일정 추가하기**, **이 일정으로 저장**은 저장 전 미리보기 상단에 렌더링하지 않는다.
- Candidate controls: 각 추천 후보 아티클의 개별 **저장/취소** 버튼은 유지한다.
- Replace safety: **전체 저장**은 `추천 일정으로 바꿀까요?` 확인 뒤 **저장**을 누르면 `전체 저장을 확정할까요?` 2차 확인으로 이동하고, **확정** 버튼에서만 기존 일정 삭제 + 남은 추천 후보 전체 저장을 실행하며 성공 후 저장 전 미리보기 배너/후보 카드를 닫는다.
- Frontend/API boundary: 이번 범위는 `AppDataApi`의 기존 trip place save/delete 흐름만 사용하며 API/DB DTO 변경은 없다.
- Validation date: 2026-06-19.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Current task spec: `.omx/specs/deep-interview-preview-replace-actions.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Diff/UTF-8 hygiene: `git diff --check` passed; changed/untracked text files UTF-8 scan checked `26` files and found `0` decode errors / `0` `U+FFFD`.
- Secret-file gate: `.env`, `deploy/.env.prod`, `deploy/.env.staging`, `deploy/.env.tunnel` are not tracked by git; diff secret-name scan returned no added secret-looking lines.
- Compose config: `docker compose -f compose.yaml config` passed.
- Full frontend gate: `cd frontend && npm run typecheck && npm test && npm run build` passed; unit suite `19` files / `187` tests, build assets `dist/assets/index-DS-8cWYb.css`, `dist/assets/index-Cxqmqiwf.js`.
- Backend gate: `cd backend && .venv/bin/python -m pytest && .venv/bin/alembic upgrade head --sql` passed; backend suite `500` tests passed with `1` warning and Alembic SQL generated through head.
- Backend-mode Playwright: `cd frontend && npm run test:e2e` passed (`11` tests).
- Development server deploy: `ssh deploy@192.168.32.15` backed up server state to `/home/deploy/.travel-hunter-recovery/20260619T003353Z`, reset clean from `149c441` to verified commit `6ef0512`, ran compose config/build, Alembic upgrade, and force-recreated frontend/backend.
- Development server smoke: server worktree `status_count=0`; `https://dev.travel-hunter.co.kr/api/health` returned `status=ok`, `environment=staging`, `database=connected`; frontend served `assets/index-CaqrVx9o.js` and `assets/index-DS-8cWYb.css`.

## Remaining Risks

- **전체 저장** is intentionally destructive only after the second **확정** confirmation because it deletes existing saved trip places after saving remaining preview candidates.
- Live recommendation content still depends on backend recommendation data; this change only alters preview action UI and save orchestration labels.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
