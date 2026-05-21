# Local Collection And Itinerary Recommendation Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable local smoke path that proves TravelMonth collection, region recommendations, and itinerary auto-course creation work end to end without Cloudflare or external provider smoke.

**Architecture:** Add one backend CLI module for a single live TravelMonth collection run, then add a repo-root PowerShell smoke script that drives Docker Compose, collection, API checks, authenticated trip creation, trip detail verification, and trip recommendation verification. Strengthen backend/frontend/e2e coverage around the same boundaries while keeping existing FastAPI service/repository and frontend `AppDataApi` patterns.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, httpx, React/Vite, Vitest, Playwright, Docker Compose, PowerShell.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-05-21-local-collection-itinerary-recommendation-smoke-design.md`
- API contract: `docs/mvp-api-contract.md`
- Current work spec: `docs/current-work-spec.md`
- Backend rules: `backend/AGENTS.md`
- Frontend rules: `frontend/AGENTS.md`

## File Map

- Create `backend/app/scripts/__init__.py`: package marker for backend app scripts.
- Create `backend/app/scripts/collect_travelmonth_once.py`: live collection CLI entry point.
- Modify `backend/tests/test_travelmonth_live_collector.py`: CLI unit coverage with mocked service/session.
- Create `scripts/local-recommendation-smoke.ps1`: local Docker Compose smoke script.
- Modify `backend/tests/test_region_recommendations.py`: add collection-to-region-recommendation integration coverage using fixture HTML.
- Modify `backend/tests/test_trip_db_service.py`: add real DB/service coverage for generated trip days, places, and recommendations.
- Modify `frontend/src/App.test.tsx`: add UI assertions for generated course visibility if missing.
- Modify `frontend/e2e-backend/backend-mode.spec.ts`: strengthen backend e2e trip creation smoke to assert auto-generated places and AI results.
- Modify `docs/local-dev-runtime.md`: document local collection/recommendation smoke command.
- Modify `CHECKLIST.md`: record validation and remaining local/public smoke risks.

---

### Task 1: Backend Live Collection CLI

**Files:**
- Create: `backend/app/scripts/__init__.py`
- Create: `backend/app/scripts/collect_travelmonth_once.py`
- Modify: `backend/tests/test_travelmonth_live_collector.py`

- [ ] **Step 1: Add a failing CLI test**

Append this test to `backend/tests/test_travelmonth_live_collector.py`.

```python
def test_collect_travelmonth_once_cli_prints_json_summary(monkeypatch, capsys) -> None:
    from app.scripts import collect_travelmonth_once
    from app.services.travelmonth_collection import CollectionResult

    class FakeSession:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    def fake_session_factory():
        return FakeSession()

    def fake_collect(db, *, timeout):
        assert isinstance(db, FakeSession)
        assert timeout == 15.0
        return CollectionResult(
            source_name="여행가는 달",
            source_category="regional_benefit",
            parsed_count=58,
            created_or_updated_count=58,
        )

    monkeypatch.setattr(collect_travelmonth_once, "get_session_factory", lambda: fake_session_factory)
    monkeypatch.setattr(
        collect_travelmonth_once,
        "collect_regional_benefits_from_live_source",
        fake_collect,
    )

    exit_code = collect_travelmonth_once.main(["--timeout", "15"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert '"sourceCategory": "regional_benefit"' in captured.out
    assert '"parsedCount": 58' in captured.out
    assert '"createdOrUpdatedCount": 58' in captured.out
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```powershell
cd backend
python -m pytest tests/test_travelmonth_live_collector.py::test_collect_travelmonth_once_cli_prints_json_summary -q -p no:cacheprovider
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.scripts'` or an import error for `collect_travelmonth_once`.

- [ ] **Step 3: Create the script package marker**

Create `backend/app/scripts/__init__.py`.

```python
"""Command-line helpers for operational smoke checks."""
```

- [ ] **Step 4: Implement the CLI module**

Create `backend/app/scripts/collect_travelmonth_once.py`.

```python
from __future__ import annotations

import argparse
import json
from collections.abc import Sequence

from app.db.session import get_session_factory
from app.services.travelmonth_live_collector import collect_regional_benefits_from_live_source


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Fetch the official TravelMonth regional benefit page once and upsert parsed records.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=15.0,
        help="HTTP timeout in seconds for the official TravelMonth page fetch.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    session_factory = get_session_factory()
    with session_factory() as db:
        result = collect_regional_benefits_from_live_source(db, timeout=args.timeout)

    print(
        json.dumps(
            {
                "sourceName": result.source_name,
                "sourceCategory": result.source_category,
                "parsedCount": result.parsed_count,
                "createdOrUpdatedCount": result.created_or_updated_count,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 5: Run the targeted test and verify it passes**

Run:

```powershell
cd backend
python -m pytest tests/test_travelmonth_live_collector.py::test_collect_travelmonth_once_cli_prints_json_summary -q -p no:cacheprovider
```

Expected: `1 passed`.

- [ ] **Step 6: Run collector tests**

Run:

```powershell
cd backend
python -m pytest tests/test_travelmonth_live_collector.py tests/test_travelmonth_collection.py tests/test_travelmonth_parser.py -q -p no:cacheprovider
```

Expected: all selected tests pass.

- [ ] **Step 7: Commit Task 1**

Run:

```powershell
git add backend/app/scripts/__init__.py backend/app/scripts/collect_travelmonth_once.py backend/tests/test_travelmonth_live_collector.py
git commit -m "feat: add travelmonth collection cli"
```

---

### Task 2: Local Recommendation Smoke Script

**Files:**
- Create: `scripts/local-recommendation-smoke.ps1`

- [ ] **Step 1: Create the local smoke script**

Create `scripts/local-recommendation-smoke.ps1`.

```powershell
param(
  [string]$ComposeFile = "compose.yaml",
  [string]$EnvFile = "",
  [string]$Style = "맛집",
  [string]$Region = "부산",
  [int]$Limit = 3,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Invoke-Compose {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $baseArgs = @("compose")
  if ($EnvFile -ne "") {
    $baseArgs += @("--env-file", $EnvFile)
  }
  $baseArgs += @("-f", $ComposeFile)
  & docker @baseArgs @Args
}

function Invoke-BackendPython {
  param([string]$Code)
  $Code | Invoke-Compose exec -T backend python -
}

function Read-JsonFromBackend {
  param([string]$Path)
  $code = @"
import json
import urllib.request
with urllib.request.urlopen("http://127.0.0.1:8000$Path", timeout=15) as response:
    print(response.read().decode("utf-8"))
"@
  $raw = Invoke-BackendPython $code
  return $raw | ConvertFrom-Json
}

Write-Host "== Compose config =="
Invoke-Compose config --quiet

if (-not $SkipBuild) {
  Write-Host "== Compose build =="
  Invoke-Compose build
}

Write-Host "== Start DB =="
Invoke-Compose up -d db

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

Write-Host "== TravelMonth live collection =="
$collectionRaw = Invoke-Compose exec -T backend python -m app.scripts.collect_travelmonth_once --timeout 15
$collection = $collectionRaw | ConvertFrom-Json
if ($collection.parsedCount -le 0) {
  throw "Expected parsedCount > 0, got $($collectionRaw)"
}

Write-Host "== Quality report =="
$encodedStyle = [System.Uri]::EscapeDataString($Style)
$encodedRegion = [System.Uri]::EscapeDataString($Region)
$quality = Read-JsonFromBackend "/api/ops/external-collection/quality?style=$encodedStyle&region=$encodedRegion&limit=$Limit"
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
import json
import urllib.request

base = "http://127.0.0.1:8000"
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())

def request(path, method="GET", payload=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    with opener.open(req, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))

request("/api/auth/login", "POST", {"email": "test.user@example.com", "password": "password123"})
trip = request(
    "/api/trips",
    "POST",
    {
        "region": "$Region",
        "style": "$Style",
        "startDate": "2026-07-12",
        "endDate": "2026-07-14",
        "title": "로컬 추천 smoke 일정"
    },
)
trip_id = trip["id"]
detail = request(f"/api/trips/{trip_id}")
recommendations = request(f"/api/trips/{trip_id}/recommendations")
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

Write-Host "== Local recommendation smoke passed =="
Write-Host ("collection parsedCount={0}, quality totalRecords={1}, region recommendations={2}, tripId={3}" -f $collection.parsedCount, $quality.totalRecords, $regions.Count, $tripResult.trip.id)
```

- [ ] **Step 2: Run syntax validation**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$null = [scriptblock]::Create((Get-Content -Raw scripts\local-recommendation-smoke.ps1)); 'syntax ok'"
```

Expected: prints `syntax ok`.

- [ ] **Step 3: Run the smoke script with build skipped if images are already current**

Run:

```powershell
.\scripts\local-recommendation-smoke.ps1 -SkipBuild
```

Expected: exits 0 and prints `Local recommendation smoke passed`.

- [ ] **Step 4: Commit Task 2**

Run:

```powershell
git add scripts/local-recommendation-smoke.ps1
git commit -m "chore: add local recommendation smoke script"
```

---

### Task 3: Backend Integration Coverage

**Files:**
- Modify: `backend/tests/test_region_recommendations.py`
- Modify: `backend/tests/test_trip_db_service.py`

- [ ] **Step 1: Add fixture-backed collection-to-recommendation test**

Append to `backend/tests/test_region_recommendations.py`.

```python
def test_region_recommendations_read_records_created_by_travelmonth_collection(db: Session) -> None:
    from pathlib import Path

    from app.services.travelmonth_collection import collect_regional_benefits_from_html

    fixture_path = Path(__file__).parent / "fixtures" / "travelmonth_benefit_sample.html"
    html = fixture_path.read_text(encoding="utf-8")

    result = collect_regional_benefits_from_html(
        db,
        html,
        fetched_at=FETCHED_AT,
        today=date(2026, 5, 21),
    )
    recommendations = recommend_regions(
        db,
        today=date(2026, 5, 21),
        style="Food",
        region="Busan",
        limit=3,
    )

    assert result.parsed_count > 0
    assert result.created_or_updated_count > 0
    assert len(recommendations) > 0
    assert recommendations[0].policyCount > 0
```

- [ ] **Step 2: Run the new integration test and verify it passes or exposes fixture mismatch**

Run:

```powershell
cd backend
python -m pytest tests/test_region_recommendations.py::test_region_recommendations_read_records_created_by_travelmonth_collection -q -p no:cacheprovider
```

Expected: PASS. If it fails because the fixture has no currently active/fresh records, adjust the test `today` to the fixture's active period rather than changing production ranking rules.

- [ ] **Step 3: Add real DB trip creation persistence test**

Append to `backend/tests/test_trip_db_service.py` or extend existing trip create tests if a DB-backed fixture already exists in that file.

```python
def test_create_trip_persists_generated_days_places_and_recommendations_in_db(db_session, seed_user) -> None:
    from app.schemas.trip import CreateTripRequest
    from app.services.trips import create_trip, list_recommendations

    created = create_trip(
        db_session,
        seed_user,
        CreateTripRequest(
            region="Busan",
            style="Food",
            startDate=date(2026, 7, 12),
            endDate=date(2026, 7, 14),
            title="Busan auto-course verification",
        ),
    )

    assert created["title"] == "Busan auto-course verification"
    assert sorted(created["days"].keys()) == [1, 2, 3]
    for day_places in created["days"].values():
        assert len(day_places) == 3
        assert [place["time"] for place in day_places] == ["10:00", "14:00", "18:00"]
        assert all(place["label"] for place in day_places)

    recommendations = list_recommendations(db_session, seed_user, created["id"])
    assert recommendations is not None
    assert len(recommendations) >= 3
```

If `db_session` and `seed_user` fixtures do not exist, create local fixtures in the test file using the same SQLite setup pattern already used by nearby DB tests, and construct a `User` with committed `id`.

- [ ] **Step 4: Run backend targeted tests**

Run:

```powershell
cd backend
python -m pytest tests/test_region_recommendations.py tests/test_trip_db_service.py -q -p no:cacheprovider
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add backend/tests/test_region_recommendations.py backend/tests/test_trip_db_service.py
git commit -m "test: cover local collection recommendation flow"
```

---

### Task 4: Frontend And E2E Verification

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/e2e-backend/backend-mode.spec.ts`

- [ ] **Step 1: Strengthen frontend trip creation test**

In `frontend/src/App.test.tsx`, locate the existing trip creation test around selected region/date behavior. Extend it to assert that the created trip detail contains generated place labels and that the AI results link remains available.

Use the existing test helpers and mock API patterns in that file. The new expectations should assert:

```ts
await expect(screen.findByText(/10:00/)).resolves.toBeTruthy();
await expect(screen.findByText(/14:00/)).resolves.toBeTruthy();
await expect(screen.findByText(/18:00/)).resolves.toBeTruthy();
```

If the test uses React Testing Library `screen`, keep the assertions in that style. If it uses Vitest DOM queries from `render`, use the local pattern already present in the file.

- [ ] **Step 2: Run the targeted frontend test**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "trip"
```

Expected: selected trip tests pass.

- [ ] **Step 3: Strengthen backend e2e trip creation smoke**

Modify `frontend/e2e-backend/backend-mode.spec.ts` in the test named `backend data source creates a trip with selected profile values and policy slug`.

After extracting `createdTripId`, add:

```ts
await expect(page.locator(".itinerary-day").first()).toBeVisible();
await expect(page.locator("body")).toContainText("10:00");
await expect(page.locator("body")).toContainText("14:00");
await expect(page.locator("body")).toContainText("18:00");
```

Keep the existing `/ai-results?tripId=${createdTripId}` assertion.

- [ ] **Step 4: Run backend e2e smoke**

Run:

```powershell
cd frontend
npm run test:e2e -- --grep "backend data source creates a trip"
```

Expected: selected Playwright test passes against the configured backend-mode test setup.

- [ ] **Step 5: Commit Task 4**

Run:

```powershell
git add frontend/src/App.test.tsx frontend/e2e-backend/backend-mode.spec.ts
git commit -m "test: verify generated itinerary smoke"
```

---

### Task 5: Documentation And Checklist

**Files:**
- Modify: `docs/local-dev-runtime.md`
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Document local smoke command**

Add a section to `docs/local-dev-runtime.md`.

````markdown
## Local Collection And Recommendation Smoke

Cloudflare is not required for the local collection/recommendation smoke. The command starts local Compose services, applies migrations and seed data, runs a one-time TravelMonth collection, verifies collection quality and region recommendations, creates an authenticated trip, and checks generated trip days, places, and recommendations.

```powershell
.\scripts\local-recommendation-smoke.ps1
```

When images are already current:

```powershell
.\scripts\local-recommendation-smoke.ps1 -SkipBuild
```

Expected final line:

```text
== Local recommendation smoke passed ==
```

If an existing Docker DB volume was initialized with an older password, either recreate the local volume for a clean smoke run or synchronize the DB role password with the current local env before running migrations. Do not commit real env values.
````

- [ ] **Step 2: Record validation in CHECKLIST**

Add one entry under recent validation.

```markdown
- 2026-05-21 local collection itinerary smoke automation: added `python -m app.scripts.collect_travelmonth_once` and `scripts/local-recommendation-smoke.ps1` so local Docker Compose can verify TravelMonth collection, quality report, region recommendations, authenticated trip creation, generated trip days/places, and trip recommendations without Cloudflare. Targeted backend, frontend, e2e, script syntax, and `git diff --check` validations passed.
```

- [ ] **Step 3: Run documentation checks**

Run:

```powershell
rg -n "local-recommendation-smoke|collect_travelmonth_once|Local Collection" docs CHECKLIST.md scripts backend\app\scripts
git diff --check
```

Expected: references are present and `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Commit Task 5**

Run:

```powershell
git add docs/local-dev-runtime.md CHECKLIST.md
git commit -m "docs: document local recommendation smoke"
```

---

### Task 6: Final Verification

**Files:**
- No new edits expected.

- [ ] **Step 1: Run backend verification**

Run:

```powershell
cd backend
python -m pytest tests/test_travelmonth_live_collector.py tests/test_travelmonth_collection.py tests/test_travelmonth_parser.py tests/test_region_recommendations.py tests/test_trip_db_service.py -q -p no:cacheprovider
```

Expected: selected backend tests pass.

- [ ] **Step 2: Run frontend verification**

Run:

```powershell
cd frontend
npm run typecheck
npm test -- --run src/App.test.tsx -t "trip"
```

Expected: typecheck and selected tests pass.

- [ ] **Step 3: Run local smoke**

From repo root, run:

```powershell
.\scripts\local-recommendation-smoke.ps1 -SkipBuild
```

Expected: exits 0 and prints `Local recommendation smoke passed`.

- [ ] **Step 4: Run final diff checks**

Run:

```powershell
git diff --check
git status --short --branch
```

Expected: no whitespace errors; status shows only intended changes if final commits have not yet been made.

- [ ] **Step 5: Push or PR handoff**

If the user wants this branch published, push the current branch and open a draft PR against `develop`.

```powershell
git push -u origin codex/staging-smoke-evidence-2026-05-21
```

Draft PR title:

```text
[codex] add local collection recommendation smoke
```

Draft PR body summary:

```markdown
## Summary
- add one-shot TravelMonth collection CLI
- add local recommendation smoke script for collection, quality, recommendations, trip creation, and generated itinerary checks
- document local smoke workflow and validation evidence

## Test Plan
- backend targeted pytest
- frontend typecheck and targeted App test
- local recommendation smoke script
- git diff --check

## Notes
- Cloudflare/public HTTPS/provider smoke remains a separate operations track.
```

---

## Self-Review Notes

- Spec coverage: the plan covers the local collection command, repeatable smoke script, backend integration tests, frontend/e2e checks, docs, and final validation.
- Scope control: Cloudflare, SMTP, OAuth, SOLAPI, and Jenkins are excluded from implementation tasks.
- Type consistency: output fields use `parsedCount` and `createdOrUpdatedCount`; API checks use existing camelCase response fields.
- Risk control: live network smoke remains local/manual and is not added to CI.
