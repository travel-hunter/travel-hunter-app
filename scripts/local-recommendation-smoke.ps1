param(
  [string]$ComposeFile = "compose.yaml",
  [string]$EnvFile = "",
  [string]$Style = "food",
  [string]$Region = "busan",
  [int]$Limit = 3,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$StyleAliases = @{
  food = "$([char]0xB9DB)$([char]0xC9D1)"
  rest = "$([char]0xD734)$([char]0xC2DD)"
  experience = "$([char]0xCCB4)$([char]0xD5D8)"
  nature = "$([char]0xC790)$([char]0xC5F0)"
  photo = "$([char]0xC0AC)$([char]0xC9C4)"
}
$RegionAliases = @{
  busan = "$([char]0xBD80)$([char]0xC0B0)"
  jeju = "$([char]0xC81C)$([char]0xC8FC)"
  gangwon = "$([char]0xAC15)$([char]0xC6D0)"
  nationwide = "$([char]0xC804)$([char]0xAD6D)"
}
$EffectiveStyle = if ($StyleAliases.ContainsKey($Style)) { $StyleAliases[$Style] } else { $Style }
$EffectiveRegion = if ($RegionAliases.ContainsKey($Region)) { $RegionAliases[$Region] } else { $Region }
$StylePythonLiterals = @{
  food = "\ub9db\uc9d1"
  rest = "\ud734\uc2dd"
  experience = "\uccb4\ud5d8"
  nature = "\uc790\uc5f0"
  photo = "\uc0ac\uc9c4"
}
$RegionPythonLiterals = @{
  busan = "\ubd80\uc0b0"
  jeju = "\uc81c\uc8fc"
  gangwon = "\uac15\uc6d0"
  nationwide = "\uc804\uad6d"
}
$PythonStyleLiteral = if ($StylePythonLiterals.ContainsKey($Style)) { $StylePythonLiterals[$Style] } else { $EffectiveStyle }
$PythonRegionLiteral = if ($RegionPythonLiterals.ContainsKey($Region)) { $RegionPythonLiterals[$Region] } else { $EffectiveRegion }

if (-not $StyleAliases.ContainsKey($Style) -and $Style -notmatch '^\w+$') {
  throw "Unknown or unsafe -Style value: $Style"
}
if (-not $RegionAliases.ContainsKey($Region) -and $Region -notmatch '^\w+$') {
  throw "Unknown or unsafe -Region value: $Region"
}

function Get-ComposeBaseArgs {
  $baseArgs = @("compose")
  if ($EnvFile -ne "") {
    $baseArgs += @("--env-file", $EnvFile)
  }
  $baseArgs += @("-f", $ComposeFile)
  return $baseArgs
}

function Invoke-Compose {
  $baseArgs = Get-ComposeBaseArgs
  & docker @baseArgs @args
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose $($args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Invoke-BackendPython {
  param([string]$Code)

  $baseArgs = Get-ComposeBaseArgs
  $Code | docker @baseArgs exec -T backend python -
  if ($LASTEXITCODE -ne 0) {
    throw "backend python command failed with exit code $LASTEXITCODE"
  }
}

function Read-JsonFromBackend {
  param(
    [string]$Path,
    [string]$Token = ""
  )

  $code = @"
import urllib.request
headers = {}
if "$Token":
    headers["Authorization"] = "Bearer $Token"
request = urllib.request.Request("http://127.0.0.1:8000$Path", headers=headers)
with urllib.request.urlopen(request, timeout=15) as response:
    print(response.read().decode("utf-8"))
"@
  $rawLines = @(Invoke-BackendPython $code)
  $jsonLine = $rawLines | Where-Object {
    $trimmed = $_.Trim()
    $trimmed.StartsWith("{") -or $trimmed.StartsWith("[")
  } | Select-Object -Last 1
  if (-not $jsonLine) {
    throw "No JSON response found for $Path. Raw output: $($rawLines -join "`n")"
  }
  return $jsonLine | ConvertFrom-Json
}

Write-Host "== Compose config =="
Invoke-Compose config --quiet

if (-not $SkipBuild) {
  Write-Host "== Compose build =="
  Invoke-Compose build
}

Write-Host "== Start DB =="
Invoke-Compose up -d db

if ($EnvFile -eq "") {
  Write-Host "== Sync local DB role password =="
  Invoke-Compose exec -T db psql -U travelhunter -d travelhunter -v ON_ERROR_STOP=1 -c "ALTER USER travelhunter WITH PASSWORD 'travelhunter';"
} else {
  Write-Host "== Sync local DB role password skipped for env-file run =="
}

Write-Host "== Alembic migration =="
Invoke-Compose run --rm backend alembic upgrade head

Write-Host "== Seed =="
Invoke-Compose run --rm backend python -m app.db.seed

Write-Host "== Start app services =="
Invoke-Compose up -d backend frontend

Write-Host "== Health =="
$health = Read-JsonFromBackend "/api/health"
if ($health.status -ne "ok") {
  throw "Expected /api/health status ok, got $($health | ConvertTo-Json -Compress)"
}

Write-Host "== Smoke auth =="
$authCode = @"
import json
import urllib.request

payload = json.dumps({"email": "test.user@example.com", "password": "password123"}).encode("utf-8")
request = urllib.request.Request(
    "http://127.0.0.1:8000/api/auth/login",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(request, timeout=15) as response:
    print(json.loads(response.read().decode("utf-8"))["accessToken"])
"@
$accessTokenLines = @(Invoke-BackendPython $authCode)
$accessToken = ($accessTokenLines | Where-Object { $_.Trim() -ne "" } | Select-Object -Last 1).Trim()
if (-not $accessToken) {
  throw "Smoke auth did not return an access token"
}

Write-Host "== TravelMonth live collection =="
$collectionRaw = Invoke-Compose exec -T backend python -m app.scripts.collect_travelmonth_once --timeout 15
$collection = $collectionRaw | ConvertFrom-Json
if ($collection.parsedCount -le 0) {
  throw "Expected parsedCount > 0, got $collectionRaw"
}

Write-Host "== Quality report =="
$encodedStyle = [System.Uri]::EscapeDataString($EffectiveStyle)
$encodedRegion = [System.Uri]::EscapeDataString($EffectiveRegion)
$quality = Read-JsonFromBackend "/api/ops/external-collection/quality?style=$encodedStyle&region=$encodedRegion&limit=$Limit" -Token $accessToken
if ($quality.totalRecords -le 0) {
  throw "Expected quality totalRecords > 0"
}
if ($quality.recommendationPreview.Count -le 0) {
  throw "Expected quality recommendationPreview to be non-empty"
}

Write-Host "== Region recommendations =="
$regions = Read-JsonFromBackend "/api/recommendations/regions?style=$encodedStyle&region=$encodedRegion&limit=$Limit"
if ($regions.Count -le 0) {
  throw "Expected region recommendations to be non-empty"
}

Write-Host "== Authenticated trip creation =="
$tripCode = @"
import urllib.request
import json

base = "http://127.0.0.1:8000"
payload = {
    "email": "test.user@example.com",
    "password": "password123",
    "region": "$PythonRegionLiteral",
    "style": "$PythonStyleLiteral",
    "title": "Local recommendation smoke trip",
}
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())

def request(path, method="GET", body=None, token=None):
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token is not None:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    with opener.open(req, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))

auth = request("/api/auth/login", "POST", {"email": payload["email"], "password": payload["password"]})
access_token = auth["accessToken"]
trip = request(
    "/api/trips",
    "POST",
    {
        "region": payload["region"],
        "style": payload["style"],
        "startDate": "2026-07-12",
        "endDate": "2026-07-14",
        "title": payload["title"],
    },
    access_token,
)
trip_id = trip["id"]
detail = request(f"/api/trips/{trip_id}", token=access_token)
recommendations = request(f"/api/trips/{trip_id}/recommendations", token=access_token)
print(json.dumps({"trip": detail, "recommendations": recommendations}, ensure_ascii=False))
"@
$tripResult = Invoke-BackendPython $tripCode | ConvertFrom-Json
$days = $tripResult.trip.days
$dayNames = $days.PSObject.Properties.Name
if ($dayNames.Count -ne 3) {
  throw "Expected 3 trip days, got $($dayNames.Count)"
}
foreach ($dayName in $dayNames) {
  if ($days.$dayName.Count -ne 3) {
    throw "Expected day $dayName to have 3 places, got $($days.$dayName.Count)"
  }
}
if ($tripResult.recommendations.Count -le 0) {
  throw "Expected trip recommendations to be non-empty"
}
$recommendedPolicies = $tripResult.trip.recommendedPolicies
if ($recommendedPolicies.Count -le 0) {
  throw "Expected trip recommendedPolicies to be non-empty"
}
$recommendedPolicySlug = $recommendedPolicies[0].slug
if (-not $recommendedPolicySlug) {
  throw "Expected first recommended policy to include a slug"
}
$policyDetail = Read-JsonFromBackend "/api/policies/$recommendedPolicySlug"
if ($policyDetail.slug -ne $recommendedPolicySlug) {
  throw "Expected /api/policies/$recommendedPolicySlug to return matching slug, got $($policyDetail.slug)"
}
$policies = Read-JsonFromBackend "/api/policies"
$externalPolicy = $policies | Where-Object { $_.sourceType -eq "external" } | Select-Object -First 1
if (-not $externalPolicy) {
  throw "Expected /api/policies to include at least one collected external policy"
}
$externalPolicyDetail = Read-JsonFromBackend "/api/policies/$($externalPolicy.slug)"
if ($externalPolicyDetail.sourceType -ne "external") {
  throw "Expected external policy detail to keep sourceType=external"
}
if (-not $externalPolicyDetail.officialUrl) {
  throw "Expected external policy detail to include officialUrl"
}
if ($externalPolicyDetail.applyUrl) {
  throw "Expected collected official benefit detail to omit direct applyUrl unless a direct application URL is known"
}

Write-Host "== Local recommendation smoke passed =="
Write-Host ("collection parsedCount={0}, quality totalRecords={1}, region recommendations={2}, tripId={3}, recommendedPolicySlug={4}, externalPolicySlug={5}" -f $collection.parsedCount, $quality.totalRecords, $regions.Count, $tripResult.trip.id, $recommendedPolicySlug, $externalPolicy.slug)
