# Codex Model Workflow

## Goal

- 계획 품질(깊은 추론)과 구현 속도(코딩 최적화)를 분리해 운영한다.
- 한 대화에서 모델을 런타임 전환하지 않고, 스크립트로 별도 Codex CLI 프로세스를 띄워 역할을 분리한다.

## Policy

- Planning model: `gpt-5.5` with `model_reasoning_effort="xhigh"`.
- Implementation model: `gpt-5.3-codex` with `model_reasoning_effort="high"`.
- Planning runs in `read-only` sandbox.
- Implementation runs in `workspace-write` sandbox by default.
- Use `danger-full-access` only when the approved plan needs Docker, compose, server rebuilds, or other host-level effects.
- `scripts/codex-plan.ps1` is the default planning entrypoint (`gpt-5.5` + `xhigh` + `read-only`).
- `scripts/codex-implement.ps1` is the default implementation entrypoint (`gpt-5.3-codex` + `high` + `workspace-write`).

The active Codex App conversation model is not switched at runtime. Model separation is done by launching separate Codex CLI child processes with explicit `--model` and `model_reasoning_effort` values.

## Commands

Create a plan only:

```powershell
.\scripts\codex-plan.ps1 -Prompt "요청 내용을 분석하고 구현 계획만 작성해줘."
```

Implement an approved plan with the default implementation model:

```powershell
.\scripts\codex-implement.ps1 -PlanFile .\.codex-runs\latest-plan.md
```

Run the two-phase workflow and stop after planning:

```powershell
.\scripts\codex-workflow.ps1 -Prompt "요청 내용을 분석하고 구현 계획만 작성해줘."
```

Run implementation after reviewing the plan:

```powershell
.\scripts\codex-workflow.ps1 -PlanFile .\.codex-runs\latest-plan.md -Approved
```

Run implementation with Docker/server permissions:

```powershell
.\scripts\codex-workflow.ps1 -PlanFile .\.codex-runs\latest-plan.md -Approved -Sandbox danger-full-access
```

`danger-full-access`는 승인된 계획에서 Docker/compose/서버 재기동 같은 호스트 영향 작업이 필요한 경우에만 사용한다.

## Output

- `.codex-runs/latest-plan.md`
- `.codex-runs/latest-implementation.md`

각 실행은 위 두 파일을 최신 결과로 덮어쓴다. `.codex-runs/`는 로컬 실행 산출물이며 git ignore 상태를 유지한다.

## How to Verify the Model Used

- Planning execution is verified from the command or script defaults: `scripts/codex-plan.ps1` uses `Model = "gpt-5.5"`, `Reasoning = "xhigh"`, and `--sandbox read-only`.
- Implementation execution is verified from the command or script defaults: `scripts/codex-implement.ps1` uses `Model = "gpt-5.3-codex"`, `Reasoning = "high"`, and `--sandbox workspace-write`.
- Docker or server-affecting implementation is verified by checking whether `scripts/codex-workflow.ps1 -Approved -Sandbox danger-full-access` was used.
- `.codex-runs/latest-plan.md` and `.codex-runs/latest-implementation.md` are result artifacts. They are not the source of truth for model selection; the source of truth is the script invocation and terminal log.
- If an execution fails or times out, prefer the terminal exit code and the printed `Model`/`Reasoning`/`Sandbox` lines over `.codex-runs/latest-*.md`, because the result artifact may not be written.

## Instruction Template

```text
PLEASE IMPLEMENT THIS PLAN:

# Title

## Summary
- What to implement.

## Key Changes
- Frontend changes.
- Backend changes.
- Documentation changes.
- API/DB changes, or explicitly none.

## Test Plan
- cd frontend && npm run typecheck
- cd frontend && npm test
- cd frontend && npm run build
- cd backend && python -m pytest
- git diff --check

## Assumptions
- Out-of-scope files or behavior.
- External secret/env requirements.
- How to handle existing uncommitted changes.
```
