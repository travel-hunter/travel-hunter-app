# GitHub 협업 Workflow

## 브랜치 기준

- `main`: 운영 배포 기준 브랜치.
- `develop`: 개발 서버 배포 기준 브랜치.
- `feature/<short-name>`: 기능/수정 작업 브랜치.
- `hotfix/<short-name>`: 운영 긴급 수정 브랜치. 수정 후 `main`과 `develop`에 모두 반영한다.

목표 기본 흐름은 `feature/*` -> `develop` -> `main`이다. 현재 진행 중인 기존 작업 브랜치는 변경을 잃지 않도록 유지하고, 병합 시점에 `develop`으로 PR을 만든 뒤 이 흐름에 합류시킨다.

## 작업 시작

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<short-name>
```

작업 브랜치 이름은 기능을 짧게 드러내는 이름으로 둔다.

예시:

```text
feature/login-error-message
feature/trip-policy-banner
feature/jenkins-docs
```

## Push 전 확인

```bash
git status --short
git diff --check
```

GitHub에 올리는 대상은 source code, Dockerfile, Compose 설정, 안전한 example env, docs다. 실제 `.env`, secret, 임시 Docker 이미지 archive는 올리지 않는다.

업로드 전 정리 절차:

```bash
git status --short
git diff --check
git ls-files | rg "(^|/)(\.env|.*\.tar$|.*\.tar\.gz$|.*\.tgz$)"
rg --files -g "*.tar" -g "*.tar.gz" -g "*.tgz" -g ".env" -g ".env.*"
git check-ignore -v -- deploy/.env.dev deploy/.env.prod deploy/.env.staging deploy/.env.tunnel
```

`git ls-files`에서 실제 `.env`나 archive가 나오면 이미 추적 중인 상태이므로 push 전에 제거 계획을 세운다. `rg --files`에서 local env나 archive가 보이더라도 `.gitignore`로 제외되고 `git status --short`에 나타나지 않으면 GitHub push 대상은 아니다.

변경 영역에 따라 추가로 실행한다.

Frontend:

```bash
cd frontend
npm run typecheck
npm test
npm run build
```

Backend:

```bash
cd backend
python -m pytest
```

DB migration 변경 시:

```bash
cd backend
alembic upgrade head --sql
```

Compose 변경 시:

```bash
docker compose -f compose.yaml config
```

## PR 규칙

- `feature/*` 브랜치는 `develop`으로 PR을 만든다.
- 운영 배포 후보는 `develop`에서 `main`으로 PR을 만든다.
- PR 본문에는 변경 요약, 검증 명령, 남은 위험을 적는다.
- API shape 변경은 `docs/mvp-api-contract.md`, 프론트 타입, 백엔드 schema/test, `.agent/evals`를 같이 갱신한다.
- 실제 secret, `.env`, DB password, OAuth secret, tunnel token은 PR에 포함하지 않는다.

## GitHub Actions 역할

현재 `.github/workflows/ci.yml`은 다음을 담당한다.

- PR 검증.
- `main`, `develop` push 검증.
- frontend typecheck/test.
- backend pytest.
- 수동 `workflow_dispatch` release gate에서 e2e/build/compose build 확인.

GitHub Actions는 검증용 CI다. 목표 CD 구조에서는 개발/운영 서버 배포를 Jenkins가 담당한다.
단, Jenkins 배포는 아직 구현 전 계획 단계다. Jenkinsfile과 배포 스크립트가 추가되기 전까지 실제 서버 배포는 `07-infrastructure.md`와 `09-release-checklist.md`의 수동 명령을 따른다.

## Merge 기준

`feature/*` -> `develop`:

- PR 리뷰 또는 팀 합의 완료.
- GitHub Actions CI 통과.
- 변경 영역의 로컬 검증 결과가 PR에 기록됨.

`develop` -> `main`:

- 개발 서버 smoke test 완료.
- DB migration 영향 확인.
- 운영 env 변경 필요 여부 확인.
- release checklist 작성.

## 금지 사항

- `main` 직접 push 금지.
- 운영 secret을 GitHub issue, PR, commit, README에 평문 기록 금지.
- 사용자의 기존 worktree 변경을 임의로 revert 금지.
- API DTO에 `snake_case` 추가 금지.
- DB schema 변경에 `create_all()` 사용 금지.
