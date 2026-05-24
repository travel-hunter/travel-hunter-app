# Policy Source Audit Implementation Plan

> Superseded on 2026-05-23: the final implementation removed legacy dummy policies from runtime seed data instead of correcting `sokcho-stay` in place. Keep this plan as historical context for the audit utility and source-quality checks only.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the inaccurate Sokcho seed policy and add a repeatable policy source audit utility.

**Architecture:** Keep the user-facing API unchanged. Add deterministic backend audit functions under `backend/scripts` and update static seed/fallback data so new DB seed runs and frontend fallback mode agree.

**Tech Stack:** Python standard library, pytest, existing FastAPI/PostgreSQL seed conventions, React/Vite TypeScript fallback data.

---

### Task 1: Add Source Audit Tests

**Files:**
- Create: `backend/tests/test_policy_source_audit.py`

- [ ] **Step 1: Write failing tests**

```python
from scripts.audit_policy_sources import audit_policy, audit_policies


def policy(**overrides):
    payload = {
        "slug": "sokcho-stay",
        "title": "속초 워케이션 숙박 지원",
        "org": "속초시",
        "region": "강원",
        "summary": "속초시 워케이션 참여자가 지정 숙소와 체험콘텐츠를 이용할 수 있도록 지원합니다.",
        "officialUrl": "https://www.sokcho.go.kr/sc/portal/sokchonews/pressrelease?articleSeq=806017",
        "applyUrl": None,
    }
    payload.update(overrides)
    return payload


def test_audit_policy_rejects_portal_root_source() -> None:
    result = audit_policy(policy(officialUrl="https://www.sokcho.go.kr/sc/portal"))

    assert result.status == "invalid_source"
    assert "root" in result.reasons[0]


def test_audit_policy_marks_missing_source() -> None:
    result = audit_policy(policy(officialUrl=None, applyUrl=None))

    assert result.status == "missing_source"


def test_audit_policy_verifies_source_text_alignment() -> None:
    result = audit_policy(
        policy(),
        source_text="2025년 속초 워케이션은 지정 숙소와 관광콘텐츠 체험비를 지원한다.",
    )

    assert result.status == "verified"
    assert result.score >= 70


def test_audit_policy_flags_weak_text_alignment() -> None:
    result = audit_policy(policy(), source_text="속초시 공지사항과 일반 민원 안내입니다.")

    assert result.status == "needs_review"


def test_audit_policies_returns_slug_indexed_results() -> None:
    results = audit_policies([policy(), policy(slug="bad", officialUrl="https://example.com/policy")])

    assert [result.slug for result in results] == ["sokcho-stay", "bad"]
    assert results[1].status == "invalid_source"
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `cd backend; python -m pytest tests/test_policy_source_audit.py -q`

Expected: import failure because `scripts.audit_policy_sources` does not exist.

### Task 2: Implement Audit Utility

**Files:**
- Create: `backend/scripts/audit_policy_sources.py`

- [ ] **Step 1: Add deterministic audit implementation**

```python
from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

AuditStatus = Literal["verified", "needs_review", "invalid_source", "missing_source"]

ROOT_PATHS = {
    "/",
    "/sc",
    "/sc/portal",
    "/ct",
    "/ct/tour",
}
BLOCKED_HOST_MARKERS = ("localhost", "127.0.0.1", "example.com", "example.org", "example.net")
DEFAULT_SEED_PATH = Path(__file__).parent.parent / "app" / "data" / "seed.py"


@dataclass(frozen=True)
class PolicySourceAuditResult:
    slug: str
    status: AuditStatus
    score: int
    source_url: str | None
    reasons: list[str]


def _source_url(policy: dict[str, Any]) -> str | None:
    value = policy.get("officialUrl") or policy.get("applyUrl")
    return value if isinstance(value, str) and value.strip() else None


def _url_reasons(url: str | None) -> list[str]:
    if not url:
        return ["missing source URL"]
    if url.strip() != url:
        return ["source URL has surrounding whitespace"]
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ["source URL is not an http/https URL"]
    host = (parsed.hostname or "").lower()
    if any(marker in host for marker in BLOCKED_HOST_MARKERS):
        return ["source URL uses placeholder or local host"]
    if parsed.path.rstrip("/") in ROOT_PATHS:
        return ["source URL points to a root or portal page"]
    return []


def _tokens(policy: dict[str, Any]) -> set[str]:
    text = " ".join(
        str(policy.get(field) or "")
        for field in ("title", "org", "region", "summary", "amount", "category")
    )
    return {token for token in re.split(r"[^0-9A-Za-z가-힣]+", text) if len(token) >= 2}


def _alignment_score(policy: dict[str, Any], source_text: str | None) -> tuple[int, list[str]]:
    if source_text is None:
        return 40, ["source text was not supplied; URL shape only was checked"]
    tokens = _tokens(policy)
    if not tokens:
        return 0, ["policy has no comparable text tokens"]
    normalized_source = source_text.lower()
    matched = {token for token in tokens if token.lower() in normalized_source}
    score = int((len(matched) / max(len(tokens), 1)) * 100)
    if score < 35:
        return score, ["source text has weak title/summary alignment"]
    return score, [f"source text matched {len(matched)} policy tokens"]


def audit_policy(policy: dict[str, Any], source_text: str | None = None) -> PolicySourceAuditResult:
    slug = str(policy.get("slug") or "")
    url = _source_url(policy)
    url_reasons = _url_reasons(url)
    if not url:
        return PolicySourceAuditResult(slug=slug, status="missing_source", score=0, source_url=None, reasons=url_reasons)
    if url_reasons:
        return PolicySourceAuditResult(slug=slug, status="invalid_source", score=0, source_url=url, reasons=url_reasons)

    score, alignment_reasons = _alignment_score(policy, source_text)
    if source_text is not None and score >= 35:
        status: AuditStatus = "verified"
    else:
        status = "needs_review"
    return PolicySourceAuditResult(slug=slug, status=status, score=score, source_url=url, reasons=alignment_reasons)


def audit_policies(policies: list[dict[str, Any]]) -> list[PolicySourceAuditResult]:
    return [audit_policy(policy) for policy in policies]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit policy source URL quality.")
    parser.add_argument("--json", type=Path, help="Path to a policy JSON array.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.json:
        raise SystemExit("Pass --json with a policy JSON array for CLI auditing.")
    policies = json.loads(args.json.read_text(encoding="utf-8"))
    results = [asdict(result) for result in audit_policies(policies)]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the tests and verify pass**

Run: `cd backend; python -m pytest tests/test_policy_source_audit.py -q`

Expected: all tests pass.

### Task 3: Correct Sokcho Policy Seeds

**Files:**
- Modify: `backend/app/data/seed.py`
- Modify: `frontend/src/data/seedData.ts`
- Modify: `backend/tests/test_policy_source_audit.py`

- [ ] **Step 1: Add seed-specific assertions**

Add tests that import backend seed data and assert `sokcho-stay` uses the verified workation source and not the portal root.

- [ ] **Step 2: Run the seed assertions and verify failure**

Run: `cd backend; python -m pytest tests/test_policy_source_audit.py -q`

Expected: failure because current `sokcho-stay` still points to `/sc/portal`.

- [ ] **Step 3: Update backend and frontend seed/fallback values**

Replace the `sokcho-stay` title, amount, summary, requirements, documents, official URL, and apply URL with the approved workation values.

- [ ] **Step 4: Run the seed assertions and verify pass**

Run: `cd backend; python -m pytest tests/test_policy_source_audit.py -q`

Expected: all tests pass.

### Task 4: Validate and Record Evidence

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run targeted backend tests**

Run: `cd backend; python -m pytest tests/test_policy_source_audit.py tests/test_validate_policy_data.py tests/test_policy_data_validation.py -q`

Expected: all selected tests pass.

- [ ] **Step 2: Run frontend typecheck**

Run: `cd frontend; npm run typecheck`

Expected: typecheck passes after fallback data update.

- [ ] **Step 3: Run diff whitespace check**

Run: `git diff --check`

Expected: no whitespace errors except existing line-ending warnings if present.

- [ ] **Step 4: Update checklist**

Record test commands, results, and remaining risk that existing local DB rows may require reseeding.
