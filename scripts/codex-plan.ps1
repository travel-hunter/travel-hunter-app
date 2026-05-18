param(
  [string]$Prompt,
  [string]$PromptFile,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputFile = (Join-Path (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path ".codex-runs") "latest-plan.md"),
  [string]$Model = "gpt-5.5",
  [string]$Reasoning = "xhigh"
)

$ErrorActionPreference = "Stop"

if ($PromptFile) {
  $promptText = Get-Content -LiteralPath $PromptFile -Raw
} elseif ($Prompt) {
  $promptText = $Prompt
} else {
  throw "Provide -Prompt or -PromptFile."
}

$resolvedRepo = (Resolve-Path $RepoRoot).Path
$outputDir = Split-Path -Parent $OutputFile
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$instructions = @"
You are the planning Codex process for this repository.

Rules:
- Analyze the request and repository.
- Do not edit, create, delete, format, or move files.
- Do not run commands whose purpose is implementing the requested change.
- Return exactly one complete <proposed_plan> block.
- Make the plan decision-complete enough for another Codex process to implement.

User request:
$promptText
"@

$configValue = "model_reasoning_effort=`"$Reasoning`""
Write-Host "Codex planning execution"
Write-Host "Model: $Model"
Write-Host "Reasoning: $Reasoning"
Write-Host "Sandbox: read-only"
Write-Host "RepoRoot: $resolvedRepo"
Write-Host "OutputFile: $OutputFile"

$instructions | codex exec `
  --model $Model `
  -c $configValue `
  --sandbox read-only `
  -C $resolvedRepo `
  --output-last-message $OutputFile `
  -

Write-Host "Plan written to $OutputFile"
