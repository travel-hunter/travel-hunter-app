# Codex Model Workflow

## Policy

- Planning model: `gpt-5.5` with `model_reasoning_effort="xhigh"`.
- Implementation model: `gpt-5.3-codex` with `model_reasoning_effort="high"`.
- Planning runs in `read-only` sandbox.
- Implementation runs in `workspace-write` sandbox by default.
- Use `danger-full-access` only when the approved plan needs Docker, compose, server rebuilds, or other host-level effects.

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

## Output

- `.codex-runs/latest-plan.md`
- `.codex-runs/latest-implementation.md`

`.codex-runs/` is ignored by git because these are local run artifacts.

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
