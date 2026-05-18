param(
  [Parameter(Mandatory = $true)]
  [string]$PlanFile,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputFile = (Join-Path (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path ".codex-runs") "latest-implementation.md"),
  [ValidateSet("workspace-write", "danger-full-access")]
  [string]$Sandbox = "workspace-write",
  [string]$Model = "gpt-5.3-codex",
  [string]$Reasoning = "high"
)

$ErrorActionPreference = "Stop"

$resolvedRepo = (Resolve-Path $RepoRoot).Path
$resolvedPlan = (Resolve-Path $PlanFile).Path
$outputDir = Split-Path -Parent $OutputFile
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$planText = Get-Content -LiteralPath $resolvedPlan -Raw

$instructions = @"
You are the implementation Codex process for this repository.

Rules:
- Implement the approved plan below.
- Preserve existing user changes. Do not revert unrelated edits.
- Do not commit unless the plan explicitly asks for a commit.
- Do not write or print secrets.
- After implementation, run the validation commands that match the changed areas.
- For this project, prefer:
  - cd frontend; npm run typecheck; npm test; npm run build
  - cd backend; python -m pytest
  - cd backend; alembic upgrade head --sql, only when backend migrations or DB-facing behavior changed
  - git diff --check
- Finish with changed files, verification results, and any residual risk.

Approved plan:
$planText
"@

$configValue = "model_reasoning_effort=`"$Reasoning`""
Write-Host "Codex implementation execution"
Write-Host "Model: $Model"
Write-Host "Reasoning: $Reasoning"
Write-Host "Sandbox: $Sandbox"
Write-Host "RepoRoot: $resolvedRepo"
Write-Host "OutputFile: $OutputFile"

$instructions | codex exec `
  --model $Model `
  -c $configValue `
  --sandbox $Sandbox `
  -C $resolvedRepo `
  --output-last-message $OutputFile `
  -

Write-Host "Implementation summary written to $OutputFile"
