# Repo Slimming And Dead Code Cleanup Work Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before executing this spec task-by-task.

**Goal:** Prepare the Travel Hunter repo for deployment handoff by removing non-essential history/tooling artifacts and dead code while preserving tests, CI, deploy configuration, API contracts, and current development source-of-truth docs.

**Architecture:** Cleanup must proceed from lowest-risk generated artifacts to higher-risk source code changes. Every deletion must be backed by reference search, contract awareness, and a validation command appropriate to the touched area. Runtime behavior must remain DB-backed-only, frontend data access must stay behind `AppDataApi`, and backend API/DB contracts must not drift silently.

**Tech Stack:** React/Vite frontend, FastAPI backend, PostgreSQL, Alembic, Docker Compose, GitHub Actions, Vitest/Playwright, pytest.

---

## Scope

This cleanup includes:

- Deployment repo slimming.
- Removal of generated files, caches, local helper scripts, AI/tooling traces, stale docs, and obsolete handoff/history files.
- Dead code discovery and removal from frontend and backend.
- Unused dependency discovery.
- Documentation updates when live references point to removed files.

This cleanup excludes:

- Removing tests or CI files.
- Removing deploy files that are still part of the selected deployment path.
- Rewriting product behavior.
- Changing API shape unless a separate contract update task is created.
- Reverting unrelated worktree changes.

## Keep Criteria

Keep files when any of these are true:

- Required for app runtime, build, test, CI, Docker, deployment, migrations, or seed.
- Source of truth for current product/API/schema/deployment work.
- Used by frontend, backend, tests, CI, or compose through direct or indirect references.
- Required by `AGENTS.md`, `PLANS.md`, `docs/current-work-spec.md`, or `docs/mvp-api-contract.md`.

Always keep unless a later explicit decision overrides:

- `.github/`
- `backend/tests/`
- `frontend/e2e-backend/`
- frontend/backend test configuration
- `compose.yaml`
- active deploy compose/env example files
- `README.md`
- `AGENTS.md`
- `PLANS.md`
- `CHECKLIST.md`
- `docs/current-work-spec.md`
- `docs/mvp-api-contract.md`
- `docs/db-schema-current.md`
- `docs/db-schema-current.sql`
- `docs/deployment-cicd/README.md`
- `docs/implemented-feature-spec.md`
- `docs/requirements.md`
- `docs/local-dev-runtime.md`
- `docs/security-review/`

## Delete Criteria

Delete files or folders when all are true:

- Not required for runtime, build, test, CI, or deployment.
- Not an active source-of-truth document.
- Not referenced by live docs/config/code, or live references can be safely updated.
- Re-creatable if needed later.

Examples:

- Logs and run output: `*.log`, `*.out.log`, `*.err.log`.
- Caches and generated outputs: `.pytest_cache/`, `dist/`, `test-results/`.
- Tool traces: `.claude/`, `.superpowers/`, `CLAUDE.md`, obsolete Figma/Codex helper assets.
- Historical docs that are not active operational docs.
- Local-only helper scripts that are not CI/deploy gates.

## Dead Code Criteria

Treat code as a deletion candidate when:

- No import/reference exists in source, tests, scripts, or build config.
- It belongs to removed runtime mock mode or seed/mock fallback behavior.
- It bypasses the required frontend `AppDataApi` boundary.
- It exists only to support deleted helper scripts or stale documentation.
- It is an old fallback path superseded by DB-backed behavior and not required by `docs/mvp-api-contract.md`.

Do not remove code only because it is not obvious. First check:

- route registration
- dynamic imports
- test fixtures
- config references
- API contract references
- migration/data seed dependencies

## Execution Plan

### Task 0: Deployment Baseline Decision

**Files/Folders To Inspect:**

- `PLANS.md`
- `docs/deployment-cicd/README.md`
- `compose.yaml`
- `compose.vps.yaml`
- `compose.tunnel.yaml`
- `deploy/`

**Steps:**

- [ ] Confirm the active deployment baseline before deleting deployment support files.
- [ ] Classify each deploy surface as one of: active baseline, documented fallback, local-only development, or deletion candidate.
- [ ] Keep deployment files until their classification is explicit.
- [ ] Record the chosen baseline and fallback decision in `CHECKLIST.md`.

**Current assumption:** keep `compose.yaml` as the local/default baseline, and keep VPS/Tunnel files as documented deployment fallbacks until a later explicit decision removes one.

**Validation:**

```powershell
docker compose -f compose.yaml config
docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
git diff --check
```

### Task 1: Generated Artifact Sweep

**Files/Folders To Inspect:**

- repo root
- `backend/`
- `frontend/`

**Steps:**

- [ ] Run `git status --short`.
- [ ] Run `rg --files -g "*.log" -g "*.out.log" -g "*.err.log" -g "*.tmp" -g "*.bak" -g "*.old" -g "*.orig"`.
- [ ] Remove only generated/log/cache files confirmed as not used by source control or CI.
- [ ] Run the same `rg --files` command again and confirm no target files remain.
- [ ] Record removed paths in `CHECKLIST.md`.

**Validation:**

```powershell
git diff --check
```

### Task 2: Tooling And History Trace Cleanup

**Files/Folders To Inspect:**

- `.agent/`
- `.github/`
- `docs/`
- `frontend/figma/`
- root-level assistant/tool files

**Steps:**

- [ ] Search live references before deletion:

```powershell
rg -n "CLAUDE|superpowers|figma|codex|scripts/" README.md docs .github frontend backend CHECKLIST.md PLANS.md AGENTS.md
```

- [ ] Delete only non-runtime tooling traces and stale history files.
- [ ] Update live docs that point to deleted files.
- [ ] Keep `.github/` and test/eval files unless they are explicitly obsolete and unreferenced.
- [ ] Record decisions in `CHECKLIST.md`.

**Validation:**

```powershell
git diff --check
```

### Task 3: Active Documentation Reduction

**Files/Folders To Inspect:**

- `docs/archive/`
- `docs/deployment-cicd/`
- `docs/security-review/`
- top-level docs

**Steps:**

- [ ] Classify docs into active source-of-truth, deploy support, security gate, or archive.
- [ ] Delete or move stale history docs only after reference search.
- [ ] Keep security review checklists until all high-risk deployment items are resolved or explicitly archived.
- [ ] Update `PLANS.md` if source-of-truth doc names change.
- [ ] Update `CHECKLIST.md` with remaining documentation risks.

**Validation:**

```powershell
foreach ($path in @("path/to/deleted-file-or-folder")) {
  rg -n ([regex]::Escape($path)) README.md docs .github frontend backend PLANS.md CHECKLIST.md AGENTS.md
}
git diff --check
```

Replace `path/to/deleted-file-or-folder` with each actual deleted path from the batch. No result is expected unless the remaining reference is intentionally historical and documented as such.

### Task 4: Frontend Dead Code Pass

**Files/Folders To Inspect:**

- `frontend/src/api/`
- `frontend/src/data/`
- `frontend/src/pages/`
- `frontend/src/components/`
- `frontend/src/styles/`
- `frontend/src/App.test.tsx`

**Steps:**

- [ ] Search for direct seed/mock coupling:

```powershell
rg -n "seedData|mock|fallback|local-vacation|sokcho-stay|busan-cashback" frontend/src
```

- [ ] Search for AppDataApi bypasses:

```powershell
rg -n "fetch\\(|axios|backendApi|seedData" frontend/src
```

- [ ] For each candidate, confirm whether tests or runtime still use it.
- [ ] Remove unused components, pages, helpers, CSS selectors, and mock data only after import/reference checks.
- [ ] Prefer deleting entire unused modules over leaving empty compatibility shims.
- [ ] Update tests if they referenced deleted fixtures.

**Validation:**

```powershell
cd frontend
npm run typecheck
npm test
npm run build
```

Run e2e when routing, auth, policy, trip, or layout behavior changes:

```powershell
cd frontend
npm run test:e2e
```

### Task 5: Backend Dead Code Pass

**Files/Folders To Inspect:**

- `backend/app/api/`
- `backend/app/services/`
- `backend/app/repositories/`
- `backend/app/schemas/`
- `backend/app/data/`
- `backend/app/scripts/`
- `backend/tests/`

**Steps:**

- [ ] Search for mock/runtime fallback remnants:

```powershell
rg -n "mock|fallback|seedData|create_all|runtime mock|dummy|legacy" backend/app backend/tests
```

- [ ] Generate a candidate inventory of functions/classes. This command is not deletion evidence by itself:

```powershell
rg -n "def |class " backend/app
```

- [ ] For each candidate, check references manually with `rg`, then check route registration, FastAPI dependencies, SQLAlchemy relationships, tests, Alembic migrations, seed, and API contract before deletion.
- [ ] Remove dead backend scripts only if they are not part of deploy, CI, migration, seed, or smoke verification.
- [ ] Do not remove raw fallback behavior if `docs/mvp-api-contract.md` still documents it.
- [ ] Update tests and schemas only when behavior intentionally changes.

**Validation:**

```powershell
cd backend
python -m pytest
alembic upgrade head --sql
```

### Task 6: Dependency Cleanup

**Files To Inspect:**

- `frontend/package.json`
- `frontend/package-lock.json`
- backend dependency files

**Steps:**

- [ ] For frontend, compare package names against imports in `frontend/src`, `frontend/scripts`, tests, and config.
- [ ] For backend, compare dependency names against imports in `backend/app`, `backend/tests`, Alembic, and scripts.
- [ ] Also check CLI-only and config-only usage, including Vite, Vitest, Playwright, TypeScript type packages, ESLint-style tooling, Alembic, pytest plugins, Docker entrypoints, and GitHub Actions.
- [ ] Treat automated unused-dependency tools as candidate generators only; manually verify every removal because false positives are common.
- [ ] Remove only dependencies with no source/test/config use.
- [ ] Reinstall lockfiles with the repo's existing package manager commands.

**Validation:**

```powershell
cd frontend
npm run typecheck
npm test
npm run build

cd ../backend
python -m pytest
```

### Task 7: Deployment Surface Final Review

**Files/Folders To Inspect:**

- `compose.yaml`
- `compose.vps.yaml`
- `compose.tunnel.yaml`
- `deploy/`
- `.dockerignore`
- `.gitignore`
- `.github/workflows/`

**Steps:**

- [ ] Re-check the deployment baseline recorded in Task 0.
- [ ] Keep only deployment files that support the selected baseline or explicitly documented fallback.
- [ ] Verify `.dockerignore` excludes deleted/generated artifacts and does not exclude required runtime files.
- [ ] Verify `.gitignore` covers caches/logs generated during validation.
- [ ] Do not delete CI workflow files.

**Validation:**

```powershell
docker compose -f compose.yaml config
docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
git diff --check
```

## Final Release Cleanup Gate

Run after all cleanup tasks:

```powershell
cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run build

cd ../backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config
git diff --check
```

## Reporting Format

Each cleanup batch must report:

- Deleted paths.
- Modified docs/config/tests.
- References checked.
- Validation commands and results.
- Remaining risks.

## Current Decisions Already Applied

These entries summarize cleanup decisions already made in this slimming pass. `CHECKLIST.md` remains the detailed project-state log.

- Removed assistant/tooling traces including `.claude/`, `.superpowers/`, `CLAUDE.md`, `docs/superpowers/`, and frontend Figma helper files.
- Removed generated caches/logs discovered during cleanup.
- Removed root `scripts/` because its scripts were local helpers, not CI/deploy gates, and can be recreated later.
- Preserved tests and CI files.
