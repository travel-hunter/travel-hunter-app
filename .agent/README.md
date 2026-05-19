# Travel Hunter Agent Harness

이 폴더는 AI agent와 팀 작업자가 재사용하는 작업 지침, skill, 평가 산출물을 모아 둔 공간입니다.

## 사용 순서

1. `../AGENTS.md`를 먼저 읽습니다.
2. 변경 대상 영역에 더 가까운 nested `AGENTS.md`가 있으면 함께 읽습니다.
3. `../PLANS.md`에서 현재 우선순위와 guardrail을 확인합니다.
4. 작업 성격에 맞는 `.agent/skills` 문서를 선택합니다.
5. API 계약 변경이 포함되면 `.agent/evals` 기준을 확인합니다.
6. release readiness 검토는 `../docs/deployment-cicd/09-release-checklist.md`를 기준으로 합니다.
7. 프로젝트 상태가 바뀌면 검증 결과와 남은 리스크를 `../CHECKLIST.md`에 기록합니다.

## Skills

- `repo-orientation`: 단순하지 않은 작업을 시작하기 전에 사용합니다.
- `api-contract-sync`: API request/response shape이 바뀔 때 사용합니다.
- `frontend-route-ui`: React route, page, UI 작업에 사용합니다.
- `db-migration-plan`: PostgreSQL, SQLAlchemy, Alembic 작업 전에 사용합니다.
- `qa-release-readiness`: 인수인계 또는 release readiness 검토 전에 사용합니다.

## Evals

- `api-contract-golden.json`: endpoint 필수 필드와 예시 shape 기준입니다.
