# External Benefit Source Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate TravelMonth traffic benefits and KTO half-price local trip benefits into `external_source_records`, promote them to `policies`, and expose them through the existing policy APIs.

**Architecture:** Keep the existing `external_source_records -> policies -> API -> AppDataApi` path. Add source-specific parsers, generalize external source DTO/repository typing, then extend collection, normalization, recommendation, and ops reporting with source category controls.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, PostgreSQL/Alembic, pytest, httpx, Python `html.parser`.

---

## File Structure

Create:

- `backend/app/services/travelmonth_traffic_parser.py`: Parse `traffic.do` HTML into external source DTOs.
- `backend/app/services/dgtourcard_parser.py`: Parse `dgtourcard/tour50.do` HTML into external source DTOs.
- `backend/app/services/external_benefit_collection.py`: Run multiple source collectors and isolate per-source failures.
- `backend/tests/test_travelmonth_traffic_parser.py`: Parser tests for traffic benefits.
- `backend/tests/test_dgtourcard_parser.py`: Parser tests for half-trip benefits.
- `backend/tests/test_external_benefit_collection.py`: Multi-source collection tests.

Modify:

- `backend/app/schemas/external_sources.py`: Generalize source categories and add DTO support for the new sources.
- `backend/app/repositories/external_sources.py`: Accept generalized source DTOs and add recommendation-eligible category filtering.
- `backend/app/services/travelmonth_live_collector.py`: Reuse fetch helper or expose generic fetch behavior.
- `backend/app/services/external_collection_scheduler.py`: Use multi-source collection and support partial success.
- `backend/app/services/external_collection_quality.py`: Add optional `source_category` filtering and all-source summary.
- `backend/app/services/policy_normalization.py`: Promote `traffic_benefit` and `local_half_trip`.
- `backend/app/services/policies.py`: Map source categories to user-facing policy categories.
- `backend/app/services/region_recommendations.py`: Include `local_half_trip`, exclude `traffic_benefit`.
- `backend/app/api/routes/ops.py`: Add `sourceCategory` query parameter.
- `backend/app/schemas/ops.py`: Keep response shape stable unless source summaries are added.
- `backend/tests/test_policy_normalization.py`: Add promotion cases.
- `backend/tests/test_region_recommendations.py`: Add include/exclude category cases.
- `backend/tests/test_ops_routes.py`: Add `sourceCategory` quality filter cases.
- `docs/current-work-spec.md`, `docs/mvp-api-contract.md`, `CHECKLIST.md`: Document changed behavior and validation.

Do not create new DB tables or Alembic migrations unless implementation reveals an unavoidable schema mismatch.

---

### Task 1: Generalize External Source DTOs

**Files:**
- Modify: `backend/app/schemas/external_sources.py`
- Modify: `backend/app/repositories/external_sources.py`
- Test: `backend/tests/test_policy_normalization.py`

- [ ] **Step 1: Write failing schema/repository compatibility test**

Add this test to `backend/tests/test_policy_normalization.py`:

```python
def test_upsert_accepts_non_regional_external_source(db: Session) -> None:
    from datetime import UTC, datetime

    from app.repositories.external_sources import upsert_external_source_records
    from app.schemas.external_sources import ExternalBenefitSource

    source = ExternalBenefitSource(
        source_name="여행가는 달",
        source_type="official_campaign",
        source_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
        source_category="traffic_benefit",
        external_id="traffic-rail-1",
        canonical_key="traffic-rail-1",
        detail_url="https://www.korail.com",
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
        title="여행가는 달 철도 할인 프로모션",
        organizer_text="한국철도공사",
        organizers=["한국철도공사"],
        region="전국",
        city=None,
        is_nationwide=True,
        status_text="판매 기간 3월 16일 ~ 5월 31일",
        status="active",
        start_date=None,
        end_date=None,
        benefit_text="테마열차 운임료 50% 할인",
        benefit_value_text="50% 할인",
        extracted_amount_krw=None,
        extracted_discount_percent=50,
        benefit_value_type="percent",
        tags=["교통", "철도"],
        contact_text="한국철도공사 고객센터(1544-7788)",
        inferred_travel_styles=[],
        confidence=90,
        field_completeness=90,
        raw_list_text="테마열차 운임료 50% 할인",
        raw_detail_text="테마열차 운임료 50% 할인",
        raw_payload={"source": "traffic"},
        last_fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        last_verified_at=datetime(2026, 5, 23, tzinfo=UTC),
        freshness_status="fresh",
    )

    rows = upsert_external_source_records(db, [source])

    assert len(rows) == 1
    assert rows[0].source_category == "traffic_benefit"
    assert rows[0].benefit_value_type == "percent"
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_normalization.py::test_upsert_accepts_non_regional_external_source -q
```

Expected: fail because `ExternalBenefitSource` does not exist or source category literal rejects `traffic_benefit`.

- [ ] **Step 3: Add generalized source model**

In `backend/app/schemas/external_sources.py`, add a general model and keep the existing TravelMonth model as a subclass:

```python
SourceCategory = Literal["regional_benefit", "traffic_benefit", "local_half_trip"]


class ExternalBenefitSource(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel_case,
        populate_by_name=True,
    )

    source_name: str
    source_type: SourceType = "official_campaign"
    source_url: str
    source_category: SourceCategory
    external_id: str
    canonical_key: str
    detail_url: str | None = None
    collected_page_url: str
    title: str
    organizer_text: str
    organizers: list[str]
    region: str | None = None
    city: str | None = None
    is_nationwide: bool = False
    status_text: str | None = None
    status: SourceStatus
    start_date: date | None = None
    end_date: date | None = None
    benefit_text: str
    benefit_value_text: str | None = None
    extracted_amount_krw: int | None = None
    extracted_discount_percent: int | None = None
    benefit_value_type: BenefitValueType = "unknown"
    tags: list[str] = Field(default_factory=list)
    contact_text: str | None = None
    inferred_travel_styles: list[TravelStyle] = Field(default_factory=list)
    confidence: int = Field(ge=0, le=100)
    field_completeness: int = Field(ge=0, le=100)
    raw_list_text: str
    raw_detail_text: str
    raw_payload: dict[str, object] = Field(default_factory=dict)
    last_fetched_at: datetime
    last_verified_at: datetime | None = None
    freshness_status: FreshnessStatus
```

Then change `TravelMonthRegionalBenefitSource` to inherit from `ExternalBenefitSource` and override defaults:

```python
class TravelMonthRegionalBenefitSource(ExternalBenefitSource):
    source_name: Literal["여행가는 달"] = "여행가는 달"
    source_url: str = "https://korean.visitkorea.or.kr/travelmonth/benefit.do"
    source_category: Literal["regional_benefit"] = "regional_benefit"
```

- [ ] **Step 4: Generalize repository typing**

In `backend/app/repositories/external_sources.py`, change imports and type hints:

```python
from app.schemas.external_sources import ExternalBenefitSource
```

Update function signatures:

```python
def _assign_record(
    record: ExternalSourceRecord,
    source: ExternalBenefitSource,
) -> ExternalSourceRecord:
```

```python
def upsert_external_source_records(
    db: Session,
    sources: Iterable[ExternalBenefitSource],
) -> list[ExternalSourceRecord]:
```

- [ ] **Step 5: Run compatibility tests**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_normalization.py::test_upsert_accepts_non_regional_external_source tests/test_travelmonth_parser.py -q
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add backend/app/schemas/external_sources.py backend/app/repositories/external_sources.py backend/tests/test_policy_normalization.py
git commit -m "feat: generalize external benefit source records"
```

---

### Task 2: Add TravelMonth Traffic Parser

**Files:**
- Create: `backend/app/services/travelmonth_traffic_parser.py`
- Create: `backend/tests/test_travelmonth_traffic_parser.py`

- [ ] **Step 1: Write parser tests**

Create `backend/tests/test_travelmonth_traffic_parser.py`:

```python
from datetime import UTC, date, datetime

from app.services.travelmonth_traffic_parser import parse_traffic_benefits


TRAFFIC_HTML = """
<html><body>
<h3>여행가는 달 철도 할인 프로모션</h3>
<h4>테마열차 할인</h4>
<p>5개 정기노선 운임료 50% 할인</p>
<dl>
  <dt>판매 기간</dt><dd>3월 16일 ~ 5월 31일</dd>
  <dt>이용 기간</dt><dd>4월 1일 ~ 5월 31일</dd>
  <dt>문의처</dt><dd>한국철도공사 고객센터(1544-7788)</dd>
</dl>
<a href="https://www.korail.com">할인혜택 보러가기</a>
<h3>여행가는 달 국내 항공권 할인 프로모션</h3>
<h4>네이버 항공권에서 국내선 이용 시</h4>
<p>항공권 발권 인당 5천 포인트 지급 (최대 2만 포인트)</p>
<dl>
  <dt>판매 기간</dt><dd>3월 16일 ~ 5월 31일</dd>
  <dt>이용 기간</dt><dd>4월 1일 ~ 5월 31일</dd>
  <dt>문의처</dt><dd>네이버 항공권</dd>
</dl>
<a href="https://travel.naver.co.kr/koreatravel">할인혜택 보러가기</a>
</body></html>
"""


def test_parse_traffic_benefits_extracts_rail_and_air_records() -> None:
    records = parse_traffic_benefits(
        TRAFFIC_HTML,
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
        fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        today=date(2026, 5, 23),
    )

    assert [record.source_category for record in records] == ["traffic_benefit", "traffic_benefit"]
    assert records[0].title == "테마열차 할인"
    assert records[0].organizer_text == "한국철도공사"
    assert records[0].region == "전국"
    assert records[0].is_nationwide is True
    assert records[0].extracted_discount_percent == 50
    assert records[0].detail_url == "https://www.korail.com"
    assert records[1].title == "네이버 항공권에서 국내선 이용 시"
    assert records[1].extracted_amount_krw == 20000
    assert records[1].benefit_value_text == "최대 2만 포인트"
```

- [ ] **Step 2: Run parser tests and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_travelmonth_traffic_parser.py -q
```

Expected: fail because `travelmonth_traffic_parser.py` does not exist.

- [ ] **Step 3: Implement traffic parser**

Create `backend/app/services/travelmonth_traffic_parser.py`:

```python
from __future__ import annotations

from datetime import date, datetime
from html.parser import HTMLParser

from app.schemas.external_sources import ExternalBenefitSource
from app.services.travelmonth_normalizer import (
    calculate_field_completeness,
    extract_benefit_value,
    normalize_status,
    normalize_text,
    parse_period,
    stable_hash,
)

SOURCE_NAME = "여행가는 달"
SOURCE_URL = "https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do"
SOURCE_CATEGORY = "traffic_benefit"
NATIONWIDE_REGION = "전국"


class _TrafficBenefitHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[dict[str, object]] = []
        self._current: dict[str, object] | None = None
        self._capture: str | None = None
        self._last_dt: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value for key, value in attrs}
        if tag == "h4":
            if self._current:
                self.records.append(self._current)
            self._current = {"raw": ""}
            self._capture = "title"
            return
        if self._current is None:
            return
        if tag in {"p", "dt", "dd"}:
            self._capture = tag
        if tag == "a" and attr_map.get("href") and not self._current.get("detail_url"):
            self._current["detail_url"] = attr_map["href"]

    def handle_endtag(self, tag: str) -> None:
        if tag in {"h4", "p", "dt", "dd"}:
            self._capture = None

    def handle_data(self, data: str) -> None:
        text = normalize_text(data)
        if not text:
            return
        if self._current is not None:
            self._current["raw"] = normalize_text(f"{self._current.get('raw', '')} {text}")
        if self._current is None or self._capture is None:
            return
        if self._capture == "title":
            self._current["title"] = text
        elif self._capture == "p":
            self._current["benefit"] = normalize_text(f"{self._current.get('benefit', '')} {text}")
        elif self._capture == "dt":
            self._last_dt = text
        elif self._capture == "dd":
            if self._last_dt == "판매 기간":
                self._current["period"] = text
            elif self._last_dt == "문의처":
                self._current["contact"] = text
            self._last_dt = None

    def close(self) -> None:
        super().close()
        if self._current:
            self.records.append(self._current)
            self._current = None


def parse_traffic_benefits(
    html: str,
    *,
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> list[ExternalBenefitSource]:
    parser = _TrafficBenefitHtmlParser()
    parser.feed(html)
    parser.close()

    records: list[ExternalBenefitSource] = []
    for raw in parser.records:
        title = str(raw.get("title", ""))
        benefit_text = str(raw.get("benefit", ""))
        period_text = str(raw.get("period", ""))
        contact_text = str(raw.get("contact", "")) or None
        detail_url = str(raw.get("detail_url", "")) or None
        raw_text = str(raw.get("raw", ""))
        if not title or not benefit_text:
            continue
        try:
            start_date, end_date = parse_period(period_text)
        except ValueError:
            start_date, end_date = None, None
        status = normalize_status(None, start_date, end_date, today)
        benefit_value = extract_benefit_value(benefit_text)
        canonical_text = "|".join([SOURCE_CATEGORY, title, period_text, benefit_text])
        confidence = calculate_field_completeness(
            {
                "title": title,
                "benefit_text": benefit_text,
                "period_text": period_text,
                "detail_url": detail_url,
            }
        )
        organizer = _organizer_for(title, benefit_text, contact_text)
        records.append(
            ExternalBenefitSource(
                source_name=SOURCE_NAME,
                source_type="official_campaign",
                source_url=SOURCE_URL,
                source_category=SOURCE_CATEGORY,
                external_id=stable_hash(canonical_text),
                canonical_key=stable_hash(canonical_text),
                detail_url=detail_url,
                collected_page_url=collected_page_url,
                title=title,
                organizer_text=organizer,
                organizers=[organizer],
                region=NATIONWIDE_REGION,
                city=None,
                is_nationwide=True,
                status_text=period_text or None,
                status=status,
                start_date=start_date,
                end_date=end_date,
                benefit_text=benefit_text,
                benefit_value_text=benefit_value.value_text,
                extracted_amount_krw=benefit_value.amount_krw,
                extracted_discount_percent=benefit_value.discount_percent,
                benefit_value_type=benefit_value.value_type,
                tags=["교통", _traffic_tag(title, benefit_text)],
                contact_text=contact_text,
                inferred_travel_styles=[],
                confidence=90 if confidence >= 75 else 70,
                field_completeness=confidence,
                raw_list_text=raw_text,
                raw_detail_text=raw_text,
                raw_payload={"periodText": period_text},
                last_fetched_at=fetched_at,
                last_verified_at=fetched_at if confidence >= 75 else None,
                freshness_status="fresh" if status == "active" else "unknown",
            )
        )
    return records


def _organizer_for(title: str, benefit_text: str, contact_text: str | None) -> str:
    text = " ".join(part for part in [title, benefit_text, contact_text] if part)
    if "네이버" in text or "항공권" in text:
        return "네이버 항공권"
    if "철도" in text or "열차" in text or "내일로" in text:
        return "한국철도공사"
    return "한국관광공사"


def _traffic_tag(title: str, benefit_text: str) -> str:
    text = f"{title} {benefit_text}"
    if "항공" in text or "비행" in text:
        return "항공"
    if "철도" in text or "열차" in text or "내일로" in text:
        return "철도"
    return "교통"
```

- [ ] **Step 4: Run parser tests**

Run:

```powershell
cd backend
python -m pytest tests/test_travelmonth_traffic_parser.py -q
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/services/travelmonth_traffic_parser.py backend/tests/test_travelmonth_traffic_parser.py
git commit -m "feat: parse travelmonth traffic benefits"
```

---

### Task 3: Add DgTourCard Parser

**Files:**
- Create: `backend/app/services/dgtourcard_parser.py`
- Create: `backend/tests/test_dgtourcard_parser.py`

- [ ] **Step 1: Write parser tests**

Create `backend/tests/test_dgtourcard_parser.py`:

```python
from datetime import UTC, date, datetime

from app.services.dgtourcard_parser import parse_dgtourcard_benefits


DGTOURCARD_HTML = """
<html><body>
<h2>합천 신청접수중</h2>
<p>신청기간 : 2026.05.20-2026.06.30</p>
<p>여행기간 : 6.01~6.30</p>
<p>지역화폐 : 제로페이 앱</p>
<p>특이사항 : 지정관광지 2개소 방문 인증사진</p>
<p>문의전화 : 055-930-0000</p>
<a href="https://www.hc.go.kr">홈페이지 바로가기</a>
<h2>평창 준비중</h2>
<p>신청기간 : 준비중</p>
<p>여행기간 : 7.01~8.31</p>
<p>문의전화 : 033-333-0252</p>
</body></html>
"""


def test_parse_dgtourcard_benefits_extracts_local_records() -> None:
    records = parse_dgtourcard_benefits(
        DGTOURCARD_HTML,
        collected_page_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
        fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        today=date(2026, 5, 23),
    )

    assert [record.source_category for record in records] == ["local_half_trip", "local_half_trip"]
    assert records[0].title == "합천 반값여행 지원"
    assert records[0].region == "경남"
    assert records[0].city == "합천"
    assert records[0].status == "active"
    assert records[0].benefit_value_text == "최대 20만원 환급"
    assert records[0].detail_url == "https://www.hc.go.kr"
    assert records[0].contact_text == "055-930-0000"
    assert records[1].title == "평창 반값여행 지원"
    assert records[1].region == "강원"
    assert records[1].status == "scheduled"
```

- [ ] **Step 2: Run parser tests and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_dgtourcard_parser.py -q
```

Expected: fail because `dgtourcard_parser.py` does not exist.

- [ ] **Step 3: Implement dgtourcard parser**

Create `backend/app/services/dgtourcard_parser.py`:

```python
from __future__ import annotations

from datetime import date, datetime
from html.parser import HTMLParser

from app.schemas.external_sources import ExternalBenefitSource
from app.services.travelmonth_normalizer import normalize_text, parse_period, stable_hash

SOURCE_NAME = "대한민국 반값여행"
SOURCE_URL = "https://korean.visitkorea.or.kr/dgtourcard/tour50.do"
SOURCE_CATEGORY = "local_half_trip"
DEFAULT_BENEFIT_TEXT = "숙박, 식사, 체험 등 여행 중 사용한 금액의 50%를 환급받을 수 있으며 1인 최대 10만원, 2인 이상 최대 20만원까지 지원됩니다."

CITY_REGION = {
    "합천": "경남",
    "거창": "경남",
    "하동": "경남",
    "남해": "경남",
    "밀양": "경남",
    "평창": "강원",
    "영월": "강원",
    "횡성": "강원",
    "제천": "충북",
    "강진": "전남",
    "영광": "전남",
    "해남": "전남",
    "영암": "전남",
    "고흥": "전남",
    "완도": "전남",
    "고창": "전북",
}


class _DgTourCardHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[dict[str, object]] = []
        self._current: dict[str, object] | None = None
        self._capture_heading = False
        self._capture_paragraph = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value for key, value in attrs}
        if tag in {"h2", "h3"}:
            self._finish_current()
            self._current = {"raw": ""}
            self._capture_heading = True
        elif tag == "p" and self._current is not None:
            self._capture_paragraph = True
        elif tag == "a" and self._current is not None and attr_map.get("href") and not self._current.get("detail_url"):
            self._current["detail_url"] = attr_map["href"]

    def handle_endtag(self, tag: str) -> None:
        if tag in {"h2", "h3"}:
            self._capture_heading = False
        elif tag == "p":
            self._capture_paragraph = False

    def handle_data(self, data: str) -> None:
        text = normalize_text(data)
        if not text or self._current is None:
            return
        self._current["raw"] = normalize_text(f"{self._current.get('raw', '')} {text}")
        if self._capture_heading:
            self._current["heading"] = text
        elif self._capture_paragraph:
            paragraphs = self._current.setdefault("paragraphs", [])
            if isinstance(paragraphs, list):
                paragraphs.append(text)

    def close(self) -> None:
        super().close()
        self._finish_current()

    def _finish_current(self) -> None:
        if self._current and self._current.get("heading"):
            self.records.append(self._current)
        self._current = None


def parse_dgtourcard_benefits(
    html: str,
    *,
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> list[ExternalBenefitSource]:
    parser = _DgTourCardHtmlParser()
    parser.feed(html)
    parser.close()

    records: list[ExternalBenefitSource] = []
    for raw in parser.records:
        heading = str(raw.get("heading", ""))
        city, status_text = _split_heading(heading)
        if not city:
            continue
        paragraphs = [str(item) for item in raw.get("paragraphs", []) if str(item).strip()]
        application_period = _value_after_label(paragraphs, "신청기간")
        trip_period = _value_after_label(paragraphs, "여행기간") or _value_after_label(paragraphs, "여행일정")
        contact_text = _value_after_label(paragraphs, "문의전화")
        detail_url = str(raw.get("detail_url", "")) or None
        start_date, end_date = _parse_application_period(application_period)
        status = _status_from(status_text, application_period, start_date, end_date, today)
        title = f"{city} 반값여행 지원"
        raw_text = str(raw.get("raw", ""))
        canonical_text = "|".join([SOURCE_CATEGORY, city, application_period or "", trip_period or ""])
        records.append(
            ExternalBenefitSource(
                source_name=SOURCE_NAME,
                source_type="official_campaign",
                source_url=SOURCE_URL,
                source_category=SOURCE_CATEGORY,
                external_id=stable_hash(canonical_text),
                canonical_key=stable_hash(canonical_text),
                detail_url=detail_url,
                collected_page_url=collected_page_url,
                title=title,
                organizer_text=f"{city} 지자체",
                organizers=[f"{city} 지자체", "한국관광공사"],
                region=CITY_REGION.get(city),
                city=city,
                is_nationwide=False,
                status_text=status_text or application_period,
                status=status,
                start_date=start_date,
                end_date=end_date,
                benefit_text=DEFAULT_BENEFIT_TEXT,
                benefit_value_text="최대 20만원 환급",
                extracted_amount_krw=200000,
                extracted_discount_percent=50,
                benefit_value_type="mixed",
                tags=["지역할인", city, status_text or status],
                contact_text=contact_text,
                inferred_travel_styles=["체험"],
                confidence=90 if application_period or status_text else 70,
                field_completeness=90 if application_period or status_text else 70,
                raw_list_text=raw_text,
                raw_detail_text=raw_text,
                raw_payload={"applicationPeriod": application_period, "tripPeriod": trip_period},
                last_fetched_at=fetched_at,
                last_verified_at=fetched_at if status in {"active", "scheduled"} else None,
                freshness_status="fresh" if status == "active" else "unknown",
            )
        )
    return records


def _split_heading(value: str) -> tuple[str, str | None]:
    normalized = normalize_text(value)
    for status in ("신청접수중", "준비중", "마감"):
        if normalized.endswith(status):
            return normalize_text(normalized.removesuffix(status)), status
    parts = normalized.split()
    return (parts[0], " ".join(parts[1:]) or None) if parts else ("", None)


def _value_after_label(values: list[str], label: str) -> str | None:
    for value in values:
        if label in value:
            return normalize_text(value.split(":", 1)[-1])
    return None


def _parse_application_period(value: str | None) -> tuple[date | None, date | None]:
    if not value or "준비중" in value or "미정" in value:
        return None, None
    try:
        return parse_period(value)
    except ValueError:
        return None, None


def _status_from(
    status_text: str | None,
    application_period: str | None,
    start_date: date | None,
    end_date: date | None,
    today: date,
) -> str:
    text = " ".join(part for part in [status_text, application_period] if part)
    if "마감" in text:
        return "ended"
    if "신청접수중" in text:
        return "active"
    if "준비중" in text or "예정" in text:
        return "scheduled"
    if start_date and end_date:
        if today < start_date:
            return "scheduled"
        if today > end_date:
            return "ended"
        return "active"
    return "unknown"
```

- [ ] **Step 4: Run parser tests**

Run:

```powershell
cd backend
python -m pytest tests/test_dgtourcard_parser.py -q
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/services/dgtourcard_parser.py backend/tests/test_dgtourcard_parser.py
git commit -m "feat: parse dgtourcard half trip benefits"
```

---

### Task 4: Add Multi-Source Collection Service

**Files:**
- Create: `backend/app/services/external_benefit_collection.py`
- Modify: `backend/app/services/external_collection_scheduler.py`
- Test: `backend/tests/test_external_benefit_collection.py`
- Test: `backend/tests/test_external_collection_scheduler.py`

- [ ] **Step 1: Write collection service tests**

Create `backend/tests/test_external_benefit_collection.py`:

```python
from datetime import UTC, date, datetime

import pytest

from app.services.external_benefit_collection import (
    SourceCollectionResult,
    collect_external_benefits_from_html_sources,
)


def test_collect_external_benefits_from_html_sources_upserts_all_successful_sources(db, monkeypatch) -> None:
    calls: list[str] = []

    def fake_upsert(db_arg, sources):
        calls.extend(source.source_category for source in sources)
        return list(sources)

    monkeypatch.setattr(
        "app.services.external_benefit_collection.external_source_repository.upsert_external_source_records",
        fake_upsert,
    )
    monkeypatch.setattr(
        "app.services.external_benefit_collection.policy_normalization.promote_external_benefits_to_policies",
        lambda db_arg: None,
    )

    result = collect_external_benefits_from_html_sources(
        db,
        html_sources={
            "regional_benefit": "<html></html>",
            "traffic_benefit": "<h4>테마열차 할인</h4><p>운임료 50% 할인</p>",
            "local_half_trip": "<h2>합천 신청접수중</h2><p>신청기간 : 2026.05.20-2026.06.30</p>",
        },
        fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        today=date(2026, 5, 23),
    )

    assert isinstance(result.sources[0], SourceCollectionResult)
    assert "traffic_benefit" in calls
    assert "local_half_trip" in calls
    assert result.outcome in {"success", "partial_success"}
    assert result.created_or_updated_count == len(calls)
```

- [ ] **Step 2: Run collection test and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_external_benefit_collection.py -q
```

Expected: fail because `external_benefit_collection.py` does not exist.

- [ ] **Step 3: Implement collection service**

Create `backend/app/services/external_benefit_collection.py`:

```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.repositories import external_sources as external_source_repository
from app.services import policy_normalization
from app.services.dgtourcard_parser import parse_dgtourcard_benefits
from app.services.travelmonth_collection import (
    TRAVELMONTH_REGIONAL_BENEFIT_URL,
    CollectionResult,
)
from app.services.travelmonth_parser import parse_regional_benefits
from app.services.travelmonth_traffic_parser import (
    SOURCE_URL as TRAVELMONTH_TRAFFIC_BENEFIT_URL,
    parse_traffic_benefits,
)

DGTOURCARD_URL = "https://korean.visitkorea.or.kr/dgtourcard/tour50.do"


@dataclass(frozen=True)
class SourceCollectionResult:
    source_category: str
    parsed_count: int
    created_or_updated_count: int
    outcome: str
    error: str | None = None


@dataclass(frozen=True)
class ExternalBenefitCollectionResult(CollectionResult):
    outcome: str
    sources: list[SourceCollectionResult]


def collect_external_benefits_from_html_sources(
    db: Session,
    *,
    html_sources: dict[str, str],
    fetched_at: datetime,
    today: date,
) -> ExternalBenefitCollectionResult:
    source_results: list[SourceCollectionResult] = []
    all_rows = []
    parsers = {
        "regional_benefit": lambda html: parse_regional_benefits(
            html,
            collected_page_url=TRAVELMONTH_REGIONAL_BENEFIT_URL,
            fetched_at=fetched_at,
            today=today,
        ),
        "traffic_benefit": lambda html: parse_traffic_benefits(
            html,
            collected_page_url=TRAVELMONTH_TRAFFIC_BENEFIT_URL,
            fetched_at=fetched_at,
            today=today,
        ),
        "local_half_trip": lambda html: parse_dgtourcard_benefits(
            html,
            collected_page_url=DGTOURCARD_URL,
            fetched_at=fetched_at,
            today=today,
        ),
    }
    for source_category, html in html_sources.items():
        try:
            parsed = parsers[source_category](html)
            rows = external_source_repository.upsert_external_source_records(db, parsed)
            all_rows.extend(rows)
            source_results.append(
                SourceCollectionResult(
                    source_category=source_category,
                    parsed_count=len(parsed),
                    created_or_updated_count=len(rows),
                    outcome="success",
                )
            )
        except Exception as exc:
            source_results.append(
                SourceCollectionResult(
                    source_category=source_category,
                    parsed_count=0,
                    created_or_updated_count=0,
                    outcome="error",
                    error=str(exc),
                )
            )
    if all_rows:
        policy_normalization.promote_external_benefits_to_policies(db)
    db.commit()
    parsed_count = sum(item.parsed_count for item in source_results)
    failed_count = sum(1 for item in source_results if item.outcome == "error")
    if failed_count == 0:
        outcome = "success"
    elif parsed_count > 0:
        outcome = "partial_success"
    else:
        outcome = "error"
    return ExternalBenefitCollectionResult(
        source_name="official external benefits",
        source_category="multiple",
        parsed_count=parsed_count,
        created_or_updated_count=len(all_rows),
        outcome=outcome,
        sources=source_results,
    )
```

- [ ] **Step 4: Add live collection entry point**

In `backend/app/services/external_benefit_collection.py`, add:

```python
import httpx
from datetime import UTC

from app.services.travelmonth_live_collector import DEFAULT_HEADERS, DEFAULT_TIMEOUT_SECONDS


def fetch_external_source_html(url: str, *, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> str:
    response = httpx.get(
        url,
        timeout=timeout,
        follow_redirects=True,
        headers=DEFAULT_HEADERS,
    )
    response.raise_for_status()
    return response.text


def collect_external_benefits_from_live_sources(
    db: Session,
    *,
    fetched_at: datetime | None = None,
    today: date | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> ExternalBenefitCollectionResult:
    fetched_at = fetched_at or datetime.now(UTC)
    today = today or fetched_at.date()
    html_sources = {
        "regional_benefit": fetch_external_source_html(TRAVELMONTH_REGIONAL_BENEFIT_URL, timeout=timeout),
        "traffic_benefit": fetch_external_source_html(TRAVELMONTH_TRAFFIC_BENEFIT_URL, timeout=timeout),
        "local_half_trip": fetch_external_source_html(DGTOURCARD_URL, timeout=timeout),
    }
    return collect_external_benefits_from_html_sources(
        db,
        html_sources=html_sources,
        fetched_at=fetched_at,
        today=today,
    )
```

- [ ] **Step 5: Update scheduler to use multi-source collector**

In `backend/app/services/external_collection_scheduler.py`, replace the collector import:

```python
from app.services.external_benefit_collection import (
    ExternalBenefitCollectionResult,
    collect_external_benefits_from_live_sources,
)
```

Update `run_external_collection_once()`:

```python
def run_external_collection_once(
    *,
    today: date | None = None,
    session_factory: sessionmaker[Session] | None = None,
) -> ExternalBenefitCollectionResult:
    run_date = today or kst_now().date()
    factory = session_factory or get_session_factory()
    db = factory()
    try:
        return collect_external_benefits_from_live_sources(db, today=run_date)
    finally:
        db.close()
```

In `run_once_if_due`, after threshold check, preserve partial success:

```python
self.status.last_outcome = result.outcome
self.status.last_error = _format_source_errors(result) if result.outcome == "partial_success" else None
```

Add helper:

```python
def _format_source_errors(result: ExternalBenefitCollectionResult) -> str | None:
    errors = [
        f"{source.source_category}: {source.error}"
        for source in result.sources
        if source.error
    ]
    return "; ".join(errors) if errors else None
```

- [ ] **Step 6: Run collection and scheduler tests**

Run:

```powershell
cd backend
python -m pytest tests/test_external_benefit_collection.py tests/test_external_collection_scheduler.py -q
```

Expected: pass after updating existing scheduler tests for `outcome="success"` or `partial_success` as appropriate.

- [ ] **Step 7: Commit**

```powershell
git add backend/app/services/external_benefit_collection.py backend/app/services/external_collection_scheduler.py backend/tests/test_external_benefit_collection.py backend/tests/test_external_collection_scheduler.py
git commit -m "feat: collect multiple external benefit sources"
```

---

### Task 5: Promote New Categories To Policies

**Files:**
- Modify: `backend/app/repositories/external_sources.py`
- Modify: `backend/app/services/policies.py`
- Modify: `backend/app/services/policy_normalization.py`
- Test: `backend/tests/test_policy_normalization.py`
- Test: `backend/tests/test_policy_db_service.py`

- [ ] **Step 1: Write promotion tests**

Add to `backend/tests/test_policy_normalization.py`:

```python
def test_promotes_traffic_and_half_trip_records_to_policies(db: Session) -> None:
    traffic = make_source(
        canonical_key="traffic",
        title="테마열차 할인",
        source_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
        source_category="traffic_benefit",
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
        region="전국",
        benefit_text="테마열차 운임료 50% 할인",
        benefit_value_text="50% 할인",
        extracted_discount_percent=50,
    )
    half_trip = make_source(
        canonical_key="hapcheon-half-trip",
        title="합천 반값여행 지원",
        source_name="대한민국 반값여행",
        source_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
        source_category="local_half_trip",
        collected_page_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
        region="경남",
        city="합천",
        benefit_text="여행 경비 50% 환급",
        benefit_value_text="최대 20만원 환급",
        extracted_amount_krw=200000,
    )
    upsert_external_source_records(db, [traffic, half_trip])

    from app.services.policy_normalization import promote_external_benefits_to_policies

    result = promote_external_benefits_to_policies(db)

    policies = db.query(Policy).order_by(Policy.id).all()
    assert result.promoted_count == 2
    assert [policy.policy_type for policy in policies] == ["교통", "지역할인"]
    assert policies[0].official_url == traffic.collected_page_url
    assert policies[1].source_category == "local_half_trip"
```

If existing `make_source()` helper does not accept all keyword overrides, extend it in the test file using:

```python
def make_source(**overrides) -> TravelMonthRegionalBenefitSource | ExternalBenefitSource:
    values = {
        "source_name": "여행가는 달",
        "source_type": "official_campaign",
        "source_url": "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        "source_category": "regional_benefit",
        ...
    }
    values.update(overrides)
    return ExternalBenefitSource(**values)
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_normalization.py::test_promotes_traffic_and_half_trip_records_to_policies -q
```

Expected: fail because promotion only lists `regional_benefit`.

- [ ] **Step 3: Add eligible category query**

In `backend/app/repositories/external_sources.py`, add:

```python
POLICY_PROMOTION_SOURCE_CATEGORIES = (
    "regional_benefit",
    "traffic_benefit",
    "local_half_trip",
)

RECOMMENDATION_SOURCE_CATEGORIES = (
    "regional_benefit",
    "local_half_trip",
)
```

Add:

```python
def list_policy_promotion_records(db: Session) -> list[ExternalSourceRecord]:
    statement = (
        select(ExternalSourceRecord)
        .where(ExternalSourceRecord.source_category.in_(POLICY_PROMOTION_SOURCE_CATEGORIES))
        .where(ExternalSourceRecord.status == "active")
        .where(ExternalSourceRecord.freshness_status == "fresh")
        .order_by(ExternalSourceRecord.id)
    )
    return list(db.scalars(statement).all())
```

Update `list_regional_benefit_recommendation_records()` to use recommendation categories:

```python
.where(ExternalSourceRecord.source_category.in_(RECOMMENDATION_SOURCE_CATEGORIES))
```

- [ ] **Step 4: Update normalization**

In `backend/app/services/policy_normalization.py`, change:

```python
records = external_source_repository.list_regional_benefit_recommendation_records(db)
```

to:

```python
records = external_source_repository.list_policy_promotion_records(db)
```

- [ ] **Step 5: Update policy category mapping**

In `backend/app/services/policies.py`, update `_external_policy_category` before URL heuristics:

```python
    if record.source_category == "traffic_benefit":
        return "교통"
    if record.source_category == "local_half_trip":
        return "지역할인"
```

Keep existing URL-based fallback for old records.

- [ ] **Step 6: Run policy tests**

Run:

```powershell
cd backend
python -m pytest tests/test_policy_normalization.py tests/test_policy_db_service.py -q
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add backend/app/repositories/external_sources.py backend/app/services/policy_normalization.py backend/app/services/policies.py backend/tests/test_policy_normalization.py backend/tests/test_policy_db_service.py
git commit -m "feat: promote new external benefit categories"
```

---

### Task 6: Extend Ops Quality Filtering

**Files:**
- Modify: `backend/app/services/external_collection_quality.py`
- Modify: `backend/app/api/routes/ops.py`
- Modify: `backend/tests/test_ops_routes.py`
- Modify: `docs/mvp-api-contract.md`

- [ ] **Step 1: Write route test for category filter**

Add to `backend/tests/test_ops_routes.py`:

```python
def test_external_collection_quality_accepts_source_category_filter(db: Session, authenticated_client) -> None:
    db.add(
        ExternalSourceRecord(
            source_name="여행가는 달",
            source_type="official_campaign",
            source_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
            source_category="traffic_benefit",
            external_id="traffic-1",
            canonical_key="traffic-1",
            detail_url=None,
            collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
            title="테마열차 할인",
            organizer_text="한국철도공사",
            organizers=["한국철도공사"],
            region="전국",
            city=None,
            is_nationwide=True,
            status="active",
            start_date=None,
            end_date=None,
            benefit_text="운임료 50% 할인",
            benefit_value_text="50% 할인",
            benefit_value_type="percent",
            tags=["교통"],
            inferred_travel_styles=[],
            confidence=90,
            field_completeness=90,
            raw_list_text="운임료 50% 할인",
            raw_detail_text="운임료 50% 할인",
            raw_payload={},
            last_fetched_at=datetime(2026, 5, 23),
            freshness_status="fresh",
        )
    )
    db.commit()

    response = authenticated_client.get(
        "/api/ops/external-collection/quality?sourceCategory=traffic_benefit"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["sourceCategory"] == "traffic_benefit"
    assert body["totalRecords"] == 1
```

Adapt fixture names to the existing `test_ops_routes.py` fixtures. If it uses `client` plus auth headers instead of `authenticated_client`, follow the existing auth pattern in that file.

- [ ] **Step 2: Run route test and verify failure**

Run:

```powershell
cd backend
python -m pytest tests/test_ops_routes.py::test_external_collection_quality_accepts_source_category_filter -q
```

Expected: fail because route does not accept `sourceCategory`.

- [ ] **Step 3: Update quality service signature**

In `backend/app/services/external_collection_quality.py`, change:

```python
def get_external_collection_quality_report(
    db: Session,
    *,
    today: date | None = None,
    style: str | None = None,
    region: str | None = None,
    limit: int = 3,
    source_category: str | None = None,
) -> ExternalCollectionQualityReport:
```

Replace category lookup with:

```python
target_category = source_category or SOURCE_CATEGORY
records = external_source_repository.list_external_source_records_by_category(
    db,
    source_category=target_category,
)
```

Return:

```python
sourceCategory=target_category,
```

- [ ] **Step 4: Update ops route**

In `backend/app/api/routes/ops.py`, add query parameter:

```python
def external_collection_quality_report(
    style: str | None = None,
    region: str | None = None,
    sourceCategory: str | None = None,
    limit: int = Query(default=3, ge=1, le=10),
    _current_user: User | None = Depends(get_current_user),
    db: Session | None = Depends(get_optional_db),
) -> ExternalCollectionQualityReport:
```

Pass through:

```python
source_category=sourceCategory,
```

- [ ] **Step 5: Document API query parameter**

In `docs/mvp-api-contract.md`, under `GET /ops/external-collection/quality` query params, add:

```markdown
| sourceCategory | string, optional | Filter quality report to one external source category such as `regional_benefit`, `traffic_benefit`, or `local_half_trip`. |
```

- [ ] **Step 6: Run ops tests**

Run:

```powershell
cd backend
python -m pytest tests/test_ops_routes.py -q
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add backend/app/services/external_collection_quality.py backend/app/api/routes/ops.py backend/tests/test_ops_routes.py docs/mvp-api-contract.md
git commit -m "feat: filter external collection quality by source category"
```

---

### Task 7: Recommendation Category Guardrails

**Files:**
- Modify: `backend/app/repositories/external_sources.py`
- Modify: `backend/tests/test_region_recommendations.py`

- [ ] **Step 1: Write recommendation tests**

Add to `backend/tests/test_region_recommendations.py`:

```python
def test_region_recommendations_include_half_trip_and_exclude_traffic(db: Session) -> None:
    upsert_external_source_records(
        db,
        [
            make_source(
                canonical_key="half-trip-hapcheon",
                source_name="대한민국 반값여행",
                source_category="local_half_trip",
                source_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
                collected_page_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
                title="합천 반값여행 지원",
                region="경남",
                city="합천",
                extracted_amount_krw=200000,
            ),
            make_source(
                canonical_key="traffic-rail",
                source_category="traffic_benefit",
                source_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
                collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
                title="테마열차 할인",
                region="전국",
                is_nationwide=True,
                extracted_discount_percent=50,
            ),
        ],
    )

    recommendations = recommend_regions(db, today=date(2026, 5, 23), limit=3)

    assert [item.region for item in recommendations] == ["경남"]
    assert recommendations[0].policyCount == 1
```

Extend the local `make_source()` helper as needed to return `ExternalBenefitSource`.

- [ ] **Step 2: Run test and verify behavior**

Run:

```powershell
cd backend
python -m pytest tests/test_region_recommendations.py::test_region_recommendations_include_half_trip_and_exclude_traffic -q
```

Expected: pass if Task 5 already changed recommendation category filtering. If it fails, ensure `list_regional_benefit_recommendation_records()` uses `RECOMMENDATION_SOURCE_CATEGORIES`.

- [ ] **Step 3: Run full recommendation tests**

Run:

```powershell
cd backend
python -m pytest tests/test_region_recommendations.py -q
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add backend/app/repositories/external_sources.py backend/tests/test_region_recommendations.py
git commit -m "test: guard external benefit recommendation categories"
```

---

### Task 8: Documentation, Checklist, And Contract Alignment

**Files:**
- Modify: `docs/current-work-spec.md`
- Modify: `docs/mvp-api-contract.md`
- Modify: `docs/db-schema-current.md`
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Update current work spec**

In `docs/current-work-spec.md`, update the external collection section to state:

```markdown
- External benefit collection now supports TravelMonth regional benefits, TravelMonth traffic benefits, and KTO half-price local trip benefits. All sources are stored in `external_source_records`; active/fresh records are promoted to `policies`. Traffic benefits are exposed in policy list/detail but excluded from destination ranking by default.
```

- [ ] **Step 2: Update API contract**

In `docs/mvp-api-contract.md`, ensure these points are present:

```markdown
`external_source_records.source_category` supported values for policy promotion are `regional_benefit`, `traffic_benefit`, and `local_half_trip`.

`GET /policies` continues to return only normalized `policies` records.

`GET /ops/external-collection/quality` accepts optional `sourceCategory`.
```

- [ ] **Step 3: Update DB schema docs if no migration is needed**

In `docs/db-schema-current.md`, add wording under `external_source_records`:

```markdown
`source_category` distinguishes source families such as `regional_benefit`, `traffic_benefit`, and `local_half_trip`; it is not limited to the original TravelMonth regional collector.
```

- [ ] **Step 4: Record validation plan in CHECKLIST**

Add a new entry to `CHECKLIST.md`:

```markdown
## 2026-05-23 External Benefit Source Expansion

- [ ] `cd backend; python -m pytest tests/test_travelmonth_traffic_parser.py tests/test_dgtourcard_parser.py tests/test_external_benefit_collection.py -q`
- [ ] `cd backend; python -m pytest tests/test_policy_normalization.py tests/test_region_recommendations.py tests/test_ops_routes.py -q`
- [ ] `cd backend; python -m pytest`
- [ ] `cd backend; alembic upgrade head --sql`
- [ ] `docker compose -f compose.yaml config`

Remaining risks:
- Official source HTML can change without notice.
- `traffic_benefit` remains excluded from destination ranking by design.
```

- [ ] **Step 5: Run doc checks**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only intended files changed.

- [ ] **Step 6: Commit**

```powershell
git add docs/current-work-spec.md docs/mvp-api-contract.md docs/db-schema-current.md CHECKLIST.md
git commit -m "docs: document expanded external benefit sources"
```

---

### Task 9: Full Verification

**Files:**
- No code changes unless verification exposes a defect.

- [ ] **Step 1: Run focused backend tests**

Run:

```powershell
cd backend
python -m pytest tests/test_travelmonth_traffic_parser.py tests/test_dgtourcard_parser.py tests/test_external_benefit_collection.py tests/test_policy_normalization.py tests/test_region_recommendations.py tests/test_ops_routes.py -q
```

Expected: pass.

- [ ] **Step 2: Run full backend test suite**

Run:

```powershell
cd backend
python -m pytest
```

Expected: pass.

- [ ] **Step 3: Run Alembic offline SQL**

Run:

```powershell
cd backend
alembic upgrade head --sql
```

Expected: command completes without migration errors.

- [ ] **Step 4: Run compose config**

Run from repo root:

```powershell
docker compose -f compose.yaml config
```

Expected: command completes and renders compose config.

- [ ] **Step 5: Update CHECKLIST validation results**

Mark the commands from Task 8 as pass/fail in `CHECKLIST.md`. For failures caused by missing local services, record the exact command and blocker.

- [ ] **Step 6: Commit validation notes**

```powershell
git add CHECKLIST.md
git commit -m "docs: record external benefit validation results"
```

---

## Self-Review

Spec coverage:

- `traffic.do` parser: Task 2.
- `dgtourcard/tour50.do` parser: Task 3.
- `external_source_records` upsert: Tasks 1 and 4.
- Policy promotion: Task 5.
- Existing frontend CTA behavior: Task 5 keeps DTO stable; Task 8 documents it.
- Recommendation guardrails: Task 7.
- Ops quality filtering: Task 6.
- Documentation and checklist: Task 8.
- Verification: Task 9.

Red-flag scan:

- Red-flag patterns were checked with `rg`; no open implementation marker remains.
- Local fixture adaptation instructions are constrained to named files and existing test helpers.

Type consistency:

- New DTO name is `ExternalBenefitSource`.
- New source categories are `traffic_benefit` and `local_half_trip`.
- Multi-source result type is `ExternalBenefitCollectionResult`.
- Ops query parameter is `sourceCategory`, mapped internally to `source_category`.
