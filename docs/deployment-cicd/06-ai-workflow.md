# AI 작업 설명서

## 목적

AI 도구는 계획과 구현을 분리해서 사용한다. 계획 품질이 필요한 작업과 코드 수정 작업을 같은 실행으로 섞지 않는다.

이 문서는 AI/Codex 작업 기준의 단일 문서다.

## 기본 역할 분리

- 계획: `gpt-5.5`, `xhigh`, read-only sandbox.
- 구현: `gpt-5.3-codex`, `high`, workspace-write sandbox.
- Docker, compose, 서버 재기동이 필요한 구현은 승인된 계획이 있을 때만 host 영향 권한을 사용한다.

## 계획 실행

```powershell
.\scripts\codex-plan.ps1 -Prompt "요청 내용을 분석하고 구현 계획만 작성해줘."
```

결과:

```text
.codex-runs/latest-plan.md
```

`.codex-runs/`는 로컬 산출물이며 gitignore 상태를 유지한다.

## 구현 실행

```powershell
.\scripts\codex-implement.ps1 -PlanFile .\.codex-runs\latest-plan.md
```

Docker/compose/서버 영향 작업이 포함된 승인 계획:

```powershell
.\scripts\codex-workflow.ps1 -PlanFile .\.codex-runs\latest-plan.md -Approved -Sandbox danger-full-access
```

## AI 작업 금지 사항

- 사용자의 기존 worktree 변경을 임의로 revert하지 않는다.
- 실제 secret, `.env`, DB password, token을 생성하거나 문서에 기록하지 않는다.
- 프론트 페이지가 `AppDataApi`를 우회해서 backend나 seed data에 직접 결합하지 않는다.
- backend route에 business logic을 과하게 넣지 않는다.
- DB schema 변경에 `create_all()`을 사용하지 않는다.

## AI 작업 후 검증

변경 영역에 맞는 검증을 실행한다.

Docs only:

```bash
git diff --check
```

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

DB migration:

```bash
cd backend
alembic upgrade head --sql
```

마지막으로 `CHECKLIST.md` 또는 PR 본문에 실행 결과와 남은 위험을 기록한다.
