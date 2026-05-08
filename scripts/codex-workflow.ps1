param(
  [string]$Prompt,
  [string]$PromptFile,
  [string]$PlanFile,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$Approved,
  [ValidateSet("workspace-write", "danger-full-access")]
  [string]$Sandbox = "workspace-write"
)

$ErrorActionPreference = "Stop"

$resolvedRepo = (Resolve-Path $RepoRoot).Path
$runDir = Join-Path $resolvedRepo ".codex-runs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$latestPlan = if ($PlanFile) { $PlanFile } else { Join-Path $runDir "latest-plan.md" }

if ($Prompt -or $PromptFile) {
  & (Join-Path $PSScriptRoot "codex-plan.ps1") `
    -Prompt $Prompt `
    -PromptFile $PromptFile `
    -RepoRoot $resolvedRepo `
    -OutputFile $latestPlan
}

if (-not $Approved) {
  Write-Host "Plan phase complete. Review $latestPlan, then rerun with -Approved to implement."
  exit 0
}

if (-not (Test-Path -LiteralPath $latestPlan)) {
  throw "Plan file not found: $latestPlan. Provide -PlanFile or generate a plan first."
}

& (Join-Path $PSScriptRoot "codex-implement.ps1") `
  -PlanFile $latestPlan `
  -RepoRoot $resolvedRepo `
  -Sandbox $Sandbox `
  -OutputFile (Join-Path $runDir "latest-implementation.md")
