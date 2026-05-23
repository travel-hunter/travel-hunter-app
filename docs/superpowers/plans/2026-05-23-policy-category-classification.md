# Policy Category Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace URL/source-category-only external policy category mapping with deterministic scoring, then reclassify promoted policies during collection and through a dry-run/apply CLI.

**Architecture:** Add a focused classifier service that scores text and metadata from `ExternalSourceRecord`. Keep `_external_policy_category()` as a compatibility wrapper, use it in promotion and raw fallback, and add a script that reclassifies existing promoted policies without creating a migration.

**Tech Stack:** FastAPI service layer, SQLAlchemy ORM, pytest, argparse JSON CLI output.

---

## File Structure

Create:

- `backend/app/services/policy_category_classifier.py`: deterministic category scoring and decision dataclass.
- `backend/tests/test_policy_category_classifier.py`: classifier examples and tie-break tests.
- `backend/app/scripts/reclassify_external_policy_categories.py`: dry-run/apply CLI for promoted policy category backfill.
- `backend/tests/test_policy_category_reclassification_cli.py`: CLI dry-run/apply tests.

Modify:

- `backend/app/services/policies.py`: replace inline `_external_policy_category()` logic with classifier wrapper.
- `backend/tests/test_policy_db_service.py`: keep raw fallback category behavior tests aligned with classifier.
- `backend/tests/test_policy_normalization.py`: add promotion reclassification regression.
- `frontend/src/App.test.tsx`: add policy category tab test with `교통` and `여행상품` data.
- `docs/current-work-spec.md`: document classifier-based categories.
- `docs/mvp-api-contract.md`: document category meaning.
- `CHECKLIST.md`: record validation commands and remaining risks.

No DB migration is required.

---

### Task 1: Add Classifier Tests And Service

**Files:**
- Create: `backend/tests/test_policy_category_classifier.py`
- Create: `backend/app/services/policy_category_classifier.py`

- [ ] **Step 1: Write failing classifier tests**

Create `backend/tests/test_policy_category_classifier.py`:

```python
from app.models import ExternalSourceRecord
from app.services.policy_category_classifier import classify_external_policy_category


def make_record(
    *,
    title: str,
    benefit_text: str = "",
    raw_detail_text: str = "",
    tags: list[str] | None = None,
    source_category: str = "regional_benefit",
    detail_url: str | None = None,
    collected_page_url: str = "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
) -> ExternalSourceRecord:
    return ExternalSourceRecord(
        source_name="여행가는 달",
        source_type="official_campaign",
        source_url=collected_page_url,
        source_category=source_category,
        external_id=title,
        canonical_key=title,
        detail_url=detail_url,
        collected_page_url=collected_page_url,
        title=title,
        organizer_text="한국관광공사",
        organizers=["한국관광공사"],
        region="전국",
        city=None,
        is_nationwide=False,
        status="active",
        benefit_text=benefit_text or title,
        benefit_value_text=None,
        benefit_value_type="unknown",
        tags=tags or [],
        inferred_travel_styles=[],
        confidence=90,
        field_completeness=90,
        raw_list_text=title,
        raw_detail_text=raw_detail_text or benefit_text or title,
        raw_payload={},
        freshness_status="fresh",
    )


def classify(title: str, **kwargs) -> str:
    return classify_external_policy_category(make_record(title=title, **kwargs)).category


def test_classifies_train_trip_as_transport_even_with_overnight_package_text() -> None:
    assert classify("남도 기차둘레길 1박 2일 최대 35% 할인행사") == "교통"


def test_classifies_transport_source_examples() -> None:
    assert classify("테마열차 할인") == "교통"
    assert classify("네이버 항공권에서 국내선 이용 시") == "교통"
    assert classify("전국 렌터카 대여료 할인") == "교통"


def test_classifies_lodging_and_package_examples() -> None:
    assert classify("피카푸 피크닉앤글램핑 숙박전용 4만원 할인") == "숙박"
    assert classify("K리그 지역 원정 경기 관람 및 체류여행 패키지 할인") == "여행상품"


def test_classifies_regional_discount_when_no_stronger_signal_exists() -> None:
    assert classify("부산 여행 캐시백") == "지역할인"


def test_source_category_boosts_do_not_override_stronger_title_signal() -> None:
    assert classify("남도 기차둘레길 할인", source_category="regional_benefit") == "교통"
    assert classify("합천 반값여행 지원", source_category="local_half_trip") == "지역할인"
    assert classify("테마열차 할인", source_category="traffic_benefit") == "교통"
```

- [ ] **Step 2: Run the classifier tests and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_category_classifier.py -q
```

Expected: fail because `policy_category_classifier.py` does not exist.

- [ ] **Step 3: Implement the classifier**

Create `backend/app/services/policy_category_classifier.py`:

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from app.models import ExternalSourceRecord


POLICY_CATEGORY_PRIORITY = ("교통", "숙박", "여행상품", "이벤트", "지역할인", "기타")

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "교통": (
        "기차",
        "열차",
        "철도",
        "ktx",
        "srt",
        "항공",
        "항공권",
        "렌터카",
        "렌트카",
        "버스",
        "셔틀",
        "승선",
        "여객선",
        "크루즈",
        "운임",
        "교통",
        "투어패스",
    ),
    "숙박": (
        "숙박",
        "호텔",
        "리조트",
        "펜션",
        "글램핑",
        "캠핑",
        "스테이",
        "객실",
        "야영장",
        "숙소",
    ),
    "여행상품": (
        "패키지",
        "여행상품",
        "관광상품",
        "체험상품",
        "투어",
        "코스",
        "1박 2일",
        "2박 3일",
        "원정 경기",
        "체류여행",
    ),
    "이벤트": (
        "이벤트",
        "프로모션",
        "추첨",
        "경품",
        "챌린지",
        "인증 이벤트",
    ),
    "지역할인": (
        "캐시백",
        "환급",
        "지역",
        "입장료",
        "할인권",
        "방문객",
        "관광지",
    ),
}

SOURCE_CATEGORY_BOOSTS: dict[str, tuple[tuple[str, int, str], ...]] = {
    "traffic_benefit": (("교통", 5, "source_category:traffic_benefit"),),
    "local_half_trip": (
        ("지역할인", 2, "source_category:local_half_trip"),
        ("여행상품", 1, "source_category:local_half_trip"),
    ),
    "regional_benefit": (("지역할인", 1, "source_category:regional_benefit"),),
}


@dataclass(frozen=True)
class PolicyCategoryDecision:
    category: str
    scores: dict[str, int]
    matched_keywords: dict[str, list[str]]


@dataclass(frozen=True)
class _WeightedText:
    text: str
    weight: int
    label: str


def classify_external_policy_category(record: ExternalSourceRecord) -> PolicyCategoryDecision:
    scores = {category: 0 for category in POLICY_CATEGORY_PRIORITY}
    matched_keywords = {category: [] for category in POLICY_CATEGORY_PRIORITY}

    for bucket in _weighted_texts(record):
        searchable = bucket.text.lower()
        if not searchable:
            continue
        for category, keywords in CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in searchable:
                    scores[category] += bucket.weight
                    _append_unique(matched_keywords[category], f"{bucket.label}:{keyword}")

    for category, boost, reason in SOURCE_CATEGORY_BOOSTS.get(record.source_category or "", ()):
        scores[category] += boost
        _append_unique(matched_keywords[category], reason)

    category = _choose_category(scores)
    return PolicyCategoryDecision(
        category=category,
        scores=scores,
        matched_keywords={
            category_name: matches
            for category_name, matches in matched_keywords.items()
            if matches
        },
    )


def _weighted_texts(record: ExternalSourceRecord) -> Iterable[_WeightedText]:
    yield _WeightedText(record.title or "", 4, "title")
    yield _WeightedText(record.benefit_text or "", 3, "benefit_text")
    yield _WeightedText(record.raw_detail_text or "", 2, "raw_detail_text")
    yield _WeightedText(" ".join(_string_values(record.tags)), 1, "tags")
    yield _WeightedText(record.organizer_text or "", 1, "organizer_text")
    yield _WeightedText(record.detail_url or "", 1, "detail_url")
    yield _WeightedText(record.collected_page_url or "", 1, "collected_page_url")


def _choose_category(scores: dict[str, int]) -> str:
    best_score = max(scores.values())
    if best_score <= 0:
        return "기타"
    for category in POLICY_CATEGORY_PRIORITY:
        if scores[category] == best_score:
            return category
    return "기타"


def _string_values(values: object) -> list[str]:
    if not isinstance(values, list):
        return []
    return [str(value) for value in values if str(value).strip()]


def _append_unique(values: list[str], value: str) -> None:
    if value not in values:
        values.append(value)
```

- [ ] **Step 4: Run classifier tests**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_category_classifier.py -q
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/services/policy_category_classifier.py backend/tests/test_policy_category_classifier.py
git commit -m "feat: classify external policy categories by score"
```

---

### Task 2: Wire Classifier Into Policies And Promotion

**Files:**
- Modify: `backend/app/services/policies.py`
- Modify: `backend/tests/test_policy_db_service.py`
- Modify: `backend/tests/test_policy_normalization.py`

- [ ] **Step 1: Add policy service regression tests**

In `backend/tests/test_policy_db_service.py`, add:

```python
def test_external_policy_category_scores_text_before_regional_default() -> None:
    record = make_external_record()
    record.source_category = "regional_benefit"
    record.title = "남도 기차둘레길 1박 2일 최대 35% 할인행사"
    record.benefit_text = "남도 기차 여행상품 최대 35% 할인"
    record.collected_page_url = "https://korean.visitkorea.or.kr/travelmonth/benefit.do"

    payload = policy_service.external_source_record_to_policy_api(record)

    assert payload["category"] == "교통"
```

In `backend/tests/test_policy_normalization.py`, add:

```python
def test_promotion_reclassifies_existing_policy_type(db: Session) -> None:
    from app.services.policy_normalization import promote_external_benefits_to_policies

    rows = upsert_external_source_records(
        db,
        [
            make_source(
                canonical_key="namdo-train",
                title="남도 기차둘레길 1박 2일 최대 35% 할인행사",
                benefit_text="남도 기차 여행상품 최대 35% 할인",
            )
        ],
    )
    result = promote_external_benefits_to_policies(db)
    policy = db.query(Policy).filter(Policy.external_source_record_id == rows[0].id).one()
    policy.policy_type = "지역할인"
    db.flush()

    second = promote_external_benefits_to_policies(db)

    assert result.promoted_count == 1
    assert second.promoted_count == 1
    assert policy.policy_type == "교통"
```

If the local `make_source()` helper does not accept `benefit_text`, extend it by adding `benefit_text: str | None = None` and using `benefit_text=benefit_text or title`.

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_db_service.py::test_external_policy_category_scores_text_before_regional_default tests/test_policy_normalization.py::test_promotion_reclassifies_existing_policy_type -q
```

Expected: fail because `_external_policy_category()` still maps `travelmonth/benefit.do` to `지역할인`.

- [ ] **Step 3: Wire policies.py to classifier**

In `backend/app/services/policies.py`, add:

```python
from app.services.policy_category_classifier import classify_external_policy_category
```

Replace `_external_policy_category()` body with:

```python
def _external_policy_category(record: ExternalSourceRecord) -> str:
    return classify_external_policy_category(record).category
```

- [ ] **Step 4: Run policy tests**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_db_service.py tests/test_policy_normalization.py -q
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/services/policies.py backend/tests/test_policy_db_service.py backend/tests/test_policy_normalization.py
git commit -m "feat: use classifier for external policy promotion"
```

---

### Task 3: Add Reclassification CLI

**Files:**
- Create: `backend/app/scripts/reclassify_external_policy_categories.py`
- Create: `backend/tests/test_policy_category_reclassification_cli.py`

- [ ] **Step 1: Write failing CLI tests**

Create `backend/tests/test_policy_category_reclassification_cli.py`:

```python
import json
from datetime import datetime

import app.models  # noqa: F401
import pytest
from sqlalchemy import Integer, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models import ExternalSourceRecord, Policy


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    external_id_column = ExternalSourceRecord.__table__.c.id
    policy_id_column = Policy.__table__.c.id
    original_external_id_type = external_id_column.type
    original_policy_id_type = policy_id_column.type
    external_id_column.type = Integer()
    policy_id_column.type = Integer()
    try:
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(bind=engine)
        with TestingSessionLocal() as session:
            yield session
        Base.metadata.drop_all(engine)
    finally:
        external_id_column.type = original_external_id_type
        policy_id_column.type = original_policy_id_type


def add_promoted_policy(db: Session) -> Policy:
    fetched_at = datetime(2026, 5, 23, 9, 0, 0)
    source = ExternalSourceRecord(
        source_name="여행가는 달",
        source_type="official_campaign",
        source_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        source_category="regional_benefit",
        external_id="namdo-train",
        canonical_key="namdo-train",
        detail_url=None,
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        title="남도 기차둘레길 1박 2일 최대 35% 할인행사",
        organizer_text="한국관광공사",
        organizers=["한국관광공사"],
        region="전남",
        city=None,
        is_nationwide=False,
        status="active",
        benefit_text="남도 기차 여행상품 최대 35% 할인",
        benefit_value_text="최대 35%",
        benefit_value_type="percent",
        tags=[],
        inferred_travel_styles=[],
        confidence=90,
        field_completeness=90,
        raw_list_text="남도 기차둘레길 1박 2일 최대 35% 할인행사",
        raw_detail_text="남도 기차 여행상품 최대 35% 할인",
        raw_payload={},
        last_fetched_at=fetched_at,
        freshness_status="fresh",
    )
    db.add(source)
    db.flush()
    policy = Policy(
        slug="travelmonth-1",
        title=source.title,
        policy_type="지역할인",
        region="전남",
        external_source_record_id=source.id,
    )
    db.add(policy)
    db.flush()
    return policy


def test_reclassification_cli_dry_run_reports_without_mutating(db: Session, monkeypatch, capsys) -> None:
    from app.scripts import reclassify_external_policy_categories as script

    policy = add_promoted_policy(db)
    monkeypatch.setattr(script, "get_session_factory", lambda: lambda: db)

    exit_code = script.main([])

    payload = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert payload["checkedCount"] == 1
    assert payload["changedCount"] == 1
    assert payload["applied"] is False
    assert payload["changes"][0]["from"] == "지역할인"
    assert payload["changes"][0]["to"] == "교통"
    assert policy.policy_type == "지역할인"


def test_reclassification_cli_apply_updates_policy(db: Session, monkeypatch, capsys) -> None:
    from app.scripts import reclassify_external_policy_categories as script

    policy = add_promoted_policy(db)
    monkeypatch.setattr(script, "get_session_factory", lambda: lambda: db)

    exit_code = script.main(["--apply"])

    payload = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert payload["checkedCount"] == 1
    assert payload["changedCount"] == 1
    assert payload["applied"] is True
    assert policy.policy_type == "교통"
```

- [ ] **Step 2: Run CLI tests and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_category_reclassification_cli.py -q
```

Expected: fail because the CLI module does not exist.

- [ ] **Step 3: Implement CLI**

Create `backend/app/scripts/reclassify_external_policy_categories.py`:

```python
from __future__ import annotations

import argparse
import json
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_session_factory
from app.models import ExternalSourceRecord, Policy
from app.services.policy_category_classifier import classify_external_policy_category


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Reclassify already-promoted external policies from linked external source records.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist category changes. Without this flag the command only reports changes.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    session_factory = get_session_factory()
    with session_factory() as db:
        payload = reclassify_external_policy_categories(db, apply=args.apply)
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    return 0


def reclassify_external_policy_categories(db: Session, *, apply: bool) -> dict[str, object]:
    policies = _list_promoted_policies(db)
    changes: list[dict[str, object]] = []
    for policy in policies:
        record = _get_external_record(db, policy.external_source_record_id)
        if record is None:
            continue
        decision = classify_external_policy_category(record)
        current_category = policy.policy_type or ""
        if current_category == decision.category:
            continue
        changes.append(
            {
                "policySlug": policy.slug,
                "title": policy.title,
                "from": current_category,
                "to": decision.category,
            }
        )
        if apply:
            policy.policy_type = decision.category
    if apply:
        db.commit()
    return {
        "checkedCount": len(policies),
        "changedCount": len(changes),
        "applied": apply,
        "changes": changes,
    }


def _list_promoted_policies(db: Session) -> list[Policy]:
    statement = (
        select(Policy)
        .where(Policy.external_source_record_id.is_not(None))
        .order_by(Policy.id)
    )
    return list(db.scalars(statement).all())


def _get_external_record(db: Session, record_id: int | None) -> ExternalSourceRecord | None:
    if record_id is None:
        return None
    return db.get(ExternalSourceRecord, record_id)


if __name__ == "__main__":
    raise SystemExit(main() or 0)
```

If the import of `selectinload` is unused, omit it from the final implementation.

- [ ] **Step 4: Run CLI tests**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_category_reclassification_cli.py -q
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/scripts/reclassify_external_policy_categories.py backend/tests/test_policy_category_reclassification_cli.py
git commit -m "feat: add external policy category reclassification cli"
```

---

### Task 4: Strengthen Frontend Category Tab Coverage

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add frontend category tab regression test**

In `frontend/src/App.test.tsx`, add a test near existing policy list tests:

```tsx
  it("shows matching policies for transport and travel product category tabs", async () => {
    const policyListSpy = vi.spyOn(appDataApi, "listPolicies").mockResolvedValue([
      {
        ...appDataApi.getPreviewTrip().recommendedPolicies[0],
        id: "transport-policy",
        slug: "transport-policy",
        label: "TR",
        tag: "교통",
        title: "남도 기차둘레길 1박 2일 최대 35% 할인행사",
        org: "한국관광공사",
        region: "전남",
        deadline: "2026-05-31",
        amount: "최대 35%",
        summary: "남도 기차 여행상품 할인",
        match: 90,
        category: "교통",
        requirements: [],
        documents: [],
        officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        applyUrl: null,
        sourceType: "external",
      },
      {
        id: "package-policy",
        slug: "package-policy",
        label: "PK",
        tag: "여행상품",
        title: "K리그 지역 원정 경기 관람 및 체류여행 패키지 할인",
        org: "한국관광공사",
        region: "전국",
        deadline: "2026-05-31",
        amount: "할인",
        summary: "체류여행 패키지 할인",
        match: 88,
        category: "여행상품",
        requirements: [],
        documents: [],
        officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        applyUrl: null,
        sourceType: "external",
      },
    ]);

    try {
      await login();
      cleanup();
      renderRoute("/policies");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("남도 기차둘레길"));
      await user.click(screen.getByRole("button", { name: "교통" }));
      expect(document.body).toHaveTextContent("남도 기차둘레길 1박 2일 최대 35% 할인행사");
      expect(screen.queryByText("K리그 지역 원정 경기 관람 및 체류여행 패키지 할인")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "여행상품" }));
      expect(document.body).toHaveTextContent("K리그 지역 원정 경기 관람 및 체류여행 패키지 할인");
      expect(screen.queryByText("남도 기차둘레길 1박 2일 최대 35% 할인행사")).not.toBeInTheDocument();
    } finally {
      policyListSpy.mockRestore();
    }
  });
```

If TypeScript rejects spreading `recommendedPolicies[0]`, replace the first object with a complete `Policy` literal without the spread.

- [ ] **Step 2: Run frontend test and fix the literal if needed**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "transport and travel product category tabs"
```

Expected: pass after using complete `Policy` literals.

- [ ] **Step 3: Commit**

```powershell
git add frontend/src/App.test.tsx
git commit -m "test: cover populated policy category tabs"
```

---

### Task 5: Documentation And Checklist

**Files:**
- Modify: `docs/current-work-spec.md`
- Modify: `docs/mvp-api-contract.md`
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Update docs**

In `docs/current-work-spec.md`, update the policy category bullet to say:

```markdown
- 정책 `category`는 혜택/출처 유형인 `교통`, `숙박`, `여행상품`, `지역할인`, `이벤트`, `기타`만 사용한다. 외부 수집 혜택은 title/benefit/tags/source metadata를 점수화하는 deterministic classifier로 category를 정하고, `travelStyles`는 지역/일정 추천 보정용으로만 사용한다.
```

In `docs/mvp-api-contract.md`, under the `category` allowed values, add:

```markdown
외부 수집 정책의 `category`는 `external_source_records`의 제목, 혜택 본문, 태그, 출처 URL, source category를 점수화한 deterministic classifier 결과다. 단순 source URL/source category 매핑이 아니며, 동점이면 `교통 > 숙박 > 여행상품 > 이벤트 > 지역할인 > 기타` 우선순위를 따른다.
```

In `CHECKLIST.md`, add:

```markdown
## 2026-05-23 Policy Category Classification

- [ ] `cd backend; python -m pytest tests/test_policy_category_classifier.py tests/test_policy_db_service.py tests/test_policy_normalization.py tests/test_policy_category_reclassification_cli.py -q`
- [ ] `cd frontend; npm test -- --run src/App.test.tsx -t "transport and travel product category tabs"`
- [ ] `git diff --check`

Remaining risks:
- Keyword rules can over-classify ambiguous policy text.
- Existing promoted DB rows require promotion rerun or `python -m app.scripts.reclassify_external_policy_categories --apply`.
```

- [ ] **Step 2: Run doc checks**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 3: Commit**

```powershell
git add docs/current-work-spec.md docs/mvp-api-contract.md CHECKLIST.md
git commit -m "docs: document policy category classifier"
```

---

### Task 6: Final Verification

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run focused backend verification**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_category_classifier.py tests/test_policy_db_service.py tests/test_policy_normalization.py tests/test_policy_category_reclassification_cli.py -q
```

Expected: pass.

- [ ] **Step 2: Run focused frontend verification**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "transport and travel product category tabs"
```

Expected: pass.

- [ ] **Step 3: Run broader backend verification**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_db_service.py tests/test_policy_normalization.py tests/test_trip_db_service.py -q
```

Expected: pass.

- [ ] **Step 4: Run diff check**

Run from repo root:

```powershell
git diff --check
git status --short --branch
```

Expected: no whitespace errors, only intended checklist update before final commit.

- [ ] **Step 5: Record CHECKLIST results**

Mark the Policy Category Classification checklist commands as passing and note the pytest cache warning if it appears.

- [ ] **Step 6: Commit validation results**

```powershell
git add CHECKLIST.md
git commit -m "docs: record policy category validation"
```

---

## Self-Review

Spec coverage:

- Scoring classifier: Task 1.
- Tie-break priority: Task 1 tests and implementation.
- Promotion always reclassifies: Task 2.
- Raw fallback uses same classifier: Task 2.
- Backfill CLI dry-run/apply: Task 3.
- Frontend category tab proof with populated backend categories: Task 4.
- Documentation and checklist: Tasks 5 and 6.

Placeholder scan:

- No TBD/TODO/fill-in implementation markers are intentionally left.

Type consistency:

- Public classifier function is `classify_external_policy_category`.
- Decision type is `PolicyCategoryDecision`.
- CLI module is `app.scripts.reclassify_external_policy_categories`.
