# Travel Hunter 협업 가이드

## 시작 순서

1. `README.md`에서 실행 방법과 문서 읽는 순서를 확인한다.
2. `docs/collaboration-handoff.md`에서 현재 브랜치, 구현 범위, 다음 작업, blocker를 확인한다.
3. `docs/current-work-spec.md`와 `docs/mvp-api-contract.md`로 구현 상태와 API 계약을 확인한다.
4. 작업 전 `git status --short`로 worktree 상태를 확인한다.

## 브랜치 전략

- `main`: 안정 릴리즈 기준.
- `develop`: 통합 개발 기준.
- `feature/<short-name>`: 기능 추가.
- `fix/<short-name>`: 버그 수정.
- `docs/<short-name>`: 문서 수정.
- 현재 MVP RC 검토 브랜치: `feat/prototype-to-react`.

모든 변경은 PR로 제출한다. `main` 병합은 RC smoke 또는 release gate 이후에만 진행한다.

## 커밋/PR 규칙

- 커밋은 목적 단위로 작게 만든다.
- 권장 prefix: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`.
- PR 본문에는 변경 요약, 영향 범위, 실행한 검증, 문서 업데이트, 남은 리스크를 적는다.
- API shape가 바뀌면 `docs/mvp-api-contract.md`, frontend type, backend schema/service/test, `.agent/evals`를 함께 갱신한다.
- DB schema는 Alembic migration으로만 변경한다. `create_all()`은 사용하지 않는다.

## 로컬 검증

기본 검증:

```bash
cd frontend
npm run typecheck
npm test

cd ../backend
python -m pytest
```

릴리즈 후보 검증:

```bash
cd frontend
npm run test:e2e
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config
```

## Secret 규칙

- `.env`, `deploy/.env.staging`, DB password, `AUTH_SECRET_KEY`, VPS SSH 정보는 커밋하지 않는다.
- repo에는 예시 파일만 둔다: `deploy/.env.staging.example`.
- 실제 staging 값은 별도 비밀 공유 수단으로 전달한다.

