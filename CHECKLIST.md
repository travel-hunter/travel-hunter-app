# CHECKLIST

## Current Status

- Latest implemented scope: `/trips/new?region=합천`처럼 정적 세부 여행권역에 없는 지자체 진입도 backend municipality→sido 정규화로 `policy-region:{sido}:{city}` fallback 카드를 만들고, frontend가 광역(`경남`) active + 실제 일정 지역(`합천`) 유지 상태로 새 일정을 생성한다. 중복 지명(`고성`, `서구`)은 정책 링크에서 `sido` 힌트로 확정한다.
- Validation date: 2026-06-17.
- Current deployment posture: PR #73 is merged to `develop`; development server was reset clean to app SHA `e8e6ed5`, frontend/backend were rebuilt with `--no-cache`, containers were force-recreated, and public smoke passed.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical detail belongs in git history, source docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Backend targeted regression: `cd backend && .venv/bin/python -m pytest tests/test_travel_areas.py` passed (`17 passed`).
- Frontend targeted regression: `cd frontend && npm test -- src/app/__tests__/trip-create.test.tsx src/app/__tests__/policies.test.tsx` passed (`30 passed`).
- Frontend typecheck: `cd frontend && npm run typecheck` passed.
- Code review gate: `codex exec ... review --uncommitted` reported no actionable correctness/security/performance/maintainability regressions.
- Development server deployment: PR #73 squash merge `e8e6ed5` deployed on `C307-24` via `git reset --hard`, `git clean -ndx`/`git clean -fdx` excluding runtime env, `docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build --no-cache frontend backend`, Alembic upgrade, and `up -d --force-recreate`.
- Development server smoke: containers healthy/running; frontend dist serves `assets/index-OUopsPMA.js` and `assets/index-C20Cq7uB.css`; public `https://dev.travel-hunter.co.kr/api/health` returned ok; public travel-area API returned `policy-region:%EA%B2%BD%EB%82%A8:%ED%95%A9%EC%B2%9C` for `query=합천` and `policy-region:%EB%B6%80%EC%82%B0:%EC%84%9C%EA%B5%AC` for `query=서구&sido=부산`.
- Diff hygiene: `git diff --check` passed; changed UTF-8 files have no `U+FFFD` replacement characters.

## Remaining Risks

- Full frontend/e2e/build suites were not rerun for this targeted municipality fallback fix.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
