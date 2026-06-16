# TravelMonth Regional Benefit Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 2 official-source collection foundation for 여행가는 달 `지역 여행할인 모아보기` by storing raw source records and deriving region, status, benefit value, and travel-style fields for later home recommendations.

**Architecture:** Add a DB-backed external source record table separate from the public `Policy` DTO. Keep parsing and normalization in focused backend service modules, persistence in a repository, and expose no public API in this first implementation slice. Tests use fixed HTML/text fixtures so the collector logic is deterministic and does not depend on live network access.

**Tech Stack:** FastAPI backend, SQLAlchemy ORM, Alembic, PostgreSQL JSONB, pytest.

---

## Scope

This plan implements the first external data collection slice only:

- Store official source records for 여행가는 달 regional benefits.
- Parse item text from captured official page HTML fixtures.
- Normalize region/city, date/status, amount/percent/free/upgrade benefit value, and style tags.
- Upsert by `canonical_key` so repeated collection is idempotent.
- Record source/freshness/completeness metadata.

This plan intentionally does not add the home recommendation API, frontend UI, live scheduler, or conversion into public `Policy` rows. Those should be separate implementation plans after this storage and parser foundation is stable.

## File Structure

- Create `backend/app/schemas/external_sources.py`: Pydantic DTOs and literals for source record shape.
- Create `backend/app/services/travelmonth_normalizer.py`: pure text/date/region/benefit/style normalization helpers.
- Create `backend/app/services/travelmonth_parser.py`: deterministic parser from HTML/text fixture into normalized input records.
- Create `backend/app/repositories/external_sources.py`: DB upsert and query functions for source records.
- Modify `backend/app/models/tables.py`: add `ExternalSourceRecord` SQLAlchemy model.
- Modify `backend/app/models/__init__.py`: export `ExternalSourceRecord`.
- Create `backend/alembic/versions/0010_external_source_records.py`: create/drop external source record table and indexes.
- Modify `backend/tests/test_db_schema.py`: assert new table and columns are registered.
- Create `backend/tests/fixtures/travelmonth_benefit_sample.html`: minimal official-page-like fixture with active, ended, nationwide, amount, percent, and free examples.
- Create `backend/tests/test_travelmonth_normalizer.py`: unit tests for pure normalization.
- Create `backend/tests/test_travelmonth_parser.py`: fixture parser tests.
- Create `backend/tests/test_external_source_repository.py`: repository upsert tests.
- Modify `docs/db-schema-current.md`: document the new table.
- Modify `docs/db-schema-current.sql`: document the new table SQL.
- Modify `docs/current-work-spec.md`: record Phase 2 official-source collection foundation status.
- Modify `docs/next-work-plan.md`: add follow-up tasks for live collector, scheduler, home recommendation API, and UI.
- Modify `CHECKLIST.md`: record validation evidence and remaining risks.

---

### Task 1: Add Schema DTOs For External Source Records

**Files:**
- Create: `backend/app/schemas/external_sources.py`
- Test: no test file yet; later tests import these types through parser/service behavior.

- [ ] **Step 1: Create the schema module**

Add `backend/app/schemas/external_sources.py`:

```python
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


SourceType = Literal["official_campaign"]
SourceCategory = Literal["regional_benefit"]
SourceStatus = Literal["active", "ended", "scheduled", "unknown"]
BenefitValueType = Literal["amount", "percent", "free", "upgrade", "mixed", "unknown"]
FreshnessStatus = Literal["fresh", "stale", "expired", "unknown"]
TravelStyle = Literal["휴식", "맛집", "체험", "자연", "사진"]


class TravelMonthRegionalBenefitSource(BaseModel):
    source_name: Literal["여행가는 달"] = "여행가는 달"
    source_type: SourceType = "official_campaign"
    source_url: str = "https://korean.visitkorea.or.kr/travelmonth/benefit.do"
    source_category: SourceCategory = "regional_benefit"
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


class ExternalSourceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_name: str
    source_type: str
    source_category: str
    external_id: str
    canonical_key: str
    title: str
    region: str | None
    city: str | None
    status: str
    benefit_value_type: str
    extracted_amount_krw: int | None
    extracted_discount_percent: int | None
    last_fetched_at: datetime
    last_verified_at: datetime | None
    freshness_status: str
```

- [ ] **Step 2: Run import check**

Run:

```bash
cd backend
python -c "from app.schemas.external_sources import TravelMonthRegionalBenefitSource; print(TravelMonthRegionalBenefitSource.__name__)"
```

Expected: prints `TravelMonthRegionalBenefitSource`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/external_sources.py
git commit -m "feat: add external source record schemas"
```

---

### Task 2: Add DB Model And Alembic Migration

**Files:**
- Modify: `backend/app/models/tables.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/0010_external_source_records.py`
- Modify: `backend/tests/test_db_schema.py`

- [ ] **Step 1: Write failing schema registration assertions**

In `backend/tests/test_db_schema.py`, add `"external_source_records"` to `expected_tables`.

Then extend `test_current_schema_decision_columns_are_registered`:

```python
    external_source_records = Base.metadata.tables["external_source_records"]
    assert "source_name" in external_source_records.c
    assert "source_type" in external_source_records.c
    assert "source_category" in external_source_records.c
    assert "external_id" in external_source_records.c
    assert "canonical_key" in external_source_records.c
    assert "detail_url" in external_source_records.c
    assert "collected_page_url" in external_source_records.c
    assert "title" in external_source_records.c
    assert "organizer_text" in external_source_records.c
    assert "organizers" in external_source_records.c
    assert "region" in external_source_records.c
    assert "city" in external_source_records.c
    assert "is_nationwide" in external_source_records.c
    assert "status_text" in external_source_records.c
    assert "status" in external_source_records.c
    assert "start_date" in external_source_records.c
    assert "end_date" in external_source_records.c
    assert "benefit_text" in external_source_records.c
    assert "benefit_value_text" in external_source_records.c
    assert "extracted_amount_krw" in external_source_records.c
    assert "extracted_discount_percent" in external_source_records.c
    assert "benefit_value_type" in external_source_records.c
    assert "tags" in external_source_records.c
    assert "contact_text" in external_source_records.c
    assert "inferred_travel_styles" in external_source_records.c
    assert "confidence" in external_source_records.c
    assert "field_completeness" in external_source_records.c
    assert "raw_list_text" in external_source_records.c
    assert "raw_detail_text" in external_source_records.c
    assert "raw_payload" in external_source_records.c
    assert "last_fetched_at" in external_source_records.c
    assert "last_verified_at" in external_source_records.c
    assert "freshness_status" in external_source_records.c
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
python -m pytest tests/test_db_schema.py -q
```

Expected: fails because `external_source_records` is not registered.

- [ ] **Step 3: Add SQLAlchemy model**

In `backend/app/models/tables.py`, after `PolicyDocument` and before `Trip`, add:

```python
class ExternalSourceRecord(Base):
    __tablename__ = "external_source_records"
    __table_args__ = (
        UniqueConstraint("source_name", "source_category", "canonical_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    source_category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    canonical_key: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    detail_url: Mapped[str | None] = mapped_column(String(500))
    collected_page_url: Mapped[str] = mapped_column(String(500), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    organizer_text: Mapped[str] = mapped_column(String(300), nullable=False)
    organizers: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    region: Mapped[str | None] = mapped_column(String(50), index=True)
    city: Mapped[str | None] = mapped_column(String(80))
    is_nationwide: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    status_text: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, index=True)
    benefit_text: Mapped[str] = mapped_column(Text, nullable=False)
    benefit_value_text: Mapped[str | None] = mapped_column(String(300))
    extracted_amount_krw: Mapped[int | None] = mapped_column(Integer)
    extracted_discount_percent: Mapped[int | None] = mapped_column(Integer)
    benefit_value_type: Mapped[str] = mapped_column(String(30), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    contact_text: Mapped[str | None] = mapped_column(String(200))
    inferred_travel_styles: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    field_completeness: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_list_text: Mapped[str] = mapped_column(Text, nullable=False)
    raw_detail_text: Mapped[str] = mapped_column(Text, nullable=False)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    last_fetched_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    freshness_status: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
```

- [ ] **Step 4: Export the model**

In `backend/app/models/__init__.py`, add `ExternalSourceRecord` to the import list and `__all__`.

- [ ] **Step 5: Create Alembic migration**

Create `backend/alembic/versions/0010_external_source_records.py`:

```python
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0010_external_source_records"
down_revision: str | None = "0009_add_trip_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "external_source_records",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source_name", sa.String(length=100), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=False),
        sa.Column("source_category", sa.String(length=80), nullable=False),
        sa.Column("external_id", sa.String(length=160), nullable=False),
        sa.Column("canonical_key", sa.String(length=160), nullable=False),
        sa.Column("detail_url", sa.String(length=500), nullable=True),
        sa.Column("collected_page_url", sa.String(length=500), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("organizer_text", sa.String(length=300), nullable=False),
        sa.Column("organizers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("region", sa.String(length=50), nullable=True),
        sa.Column("city", sa.String(length=80), nullable=True),
        sa.Column("is_nationwide", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("status_text", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("benefit_text", sa.Text(), nullable=False),
        sa.Column("benefit_value_text", sa.String(length=300), nullable=True),
        sa.Column("extracted_amount_krw", sa.Integer(), nullable=True),
        sa.Column("extracted_discount_percent", sa.Integer(), nullable=True),
        sa.Column("benefit_value_type", sa.String(length=30), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("contact_text", sa.String(length=200), nullable=True),
        sa.Column("inferred_travel_styles", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("field_completeness", sa.Integer(), nullable=False),
        sa.Column("raw_list_text", sa.Text(), nullable=False),
        sa.Column("raw_detail_text", sa.Text(), nullable=False),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("last_fetched_at", sa.DateTime(), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(), nullable=True),
        sa.Column("freshness_status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_name", "source_category", "canonical_key"),
    )
    op.create_index("ix_external_source_records_source_name", "external_source_records", ["source_name"])
    op.create_index("ix_external_source_records_source_category", "external_source_records", ["source_category"])
    op.create_index("ix_external_source_records_external_id", "external_source_records", ["external_id"])
    op.create_index("ix_external_source_records_canonical_key", "external_source_records", ["canonical_key"])
    op.create_index("ix_external_source_records_region", "external_source_records", ["region"])
    op.create_index("ix_external_source_records_status", "external_source_records", ["status"])
    op.create_index("ix_external_source_records_end_date", "external_source_records", ["end_date"])


def downgrade() -> None:
    op.drop_index("ix_external_source_records_end_date", table_name="external_source_records")
    op.drop_index("ix_external_source_records_status", table_name="external_source_records")
    op.drop_index("ix_external_source_records_region", table_name="external_source_records")
    op.drop_index("ix_external_source_records_canonical_key", table_name="external_source_records")
    op.drop_index("ix_external_source_records_external_id", table_name="external_source_records")
    op.drop_index("ix_external_source_records_source_category", table_name="external_source_records")
    op.drop_index("ix_external_source_records_source_name", table_name="external_source_records")
    op.drop_table("external_source_records")
```

- [ ] **Step 6: Run schema tests**

Run:

```bash
cd backend
python -m pytest tests/test_db_schema.py -q
```

Expected: all tests pass.

- [ ] **Step 7: Run Alembic offline SQL**

Run:

```bash
cd backend
alembic upgrade head --sql
```

Expected: generated SQL includes `CREATE TABLE external_source_records`.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/tables.py backend/app/models/__init__.py backend/alembic/versions/0010_external_source_records.py backend/tests/test_db_schema.py
git commit -m "feat: add external source records table"
```

---

### Task 3: Implement Pure Normalization Helpers

**Files:**
- Create: `backend/app/services/travelmonth_normalizer.py`
- Create: `backend/tests/test_travelmonth_normalizer.py`

- [ ] **Step 1: Write failing normalizer tests**

Create `backend/tests/test_travelmonth_normalizer.py`:

```python
from datetime import date

from app.services import travelmonth_normalizer as normalizer


def test_normalize_region_from_local_government_text() -> None:
    result = normalizer.normalize_region("강원특별자치도, 영월군")

    assert result.region == "강원"
    assert result.city == "영월군"
    assert result.is_nationwide is False


def test_normalize_region_marks_knto_single_org_as_nationwide() -> None:
    result = normalizer.normalize_region("한국관광공사")

    assert result.region is None
    assert result.city is None
    assert result.is_nationwide is True


def test_parse_period_reads_start_and_end_dates() -> None:
    assert normalizer.parse_period("2026-04-01 ~ 2026-05-31") == (
        date(2026, 4, 1),
        date(2026, 5, 31),
    )


def test_status_text_overrides_date_status() -> None:
    assert normalizer.normalize_status("[종료]", date(2026, 4, 1), date(2026, 5, 31), date(2026, 5, 21)) == "ended"
    assert normalizer.normalize_status("[진행중]", date(2026, 4, 1), date(2026, 5, 31), date(2026, 5, 21)) == "active"


def test_extract_benefit_value_prefers_largest_amount() -> None:
    value = normalizer.extract_benefit_value("개인 최대 10만원, 팀 최대 20만원까지 환급 지원")

    assert value.amount_krw == 200000
    assert value.discount_percent is None
    assert value.value_type == "amount"
    assert value.value_text == "최대 20만원"


def test_extract_benefit_value_reads_percent_when_amount_missing() -> None:
    value = normalizer.extract_benefit_value("입장료 최대 50% 할인")

    assert value.amount_krw is None
    assert value.discount_percent == 50
    assert value.value_type == "percent"
    assert value.value_text == "최대 50%"


def test_extract_benefit_value_reads_free_benefit() -> None:
    value = normalizer.extract_benefit_value("루프탑 전망대 무료 개방")

    assert value.amount_krw is None
    assert value.discount_percent is None
    assert value.value_type == "free"
    assert value.value_text == "무료"


def test_infer_travel_styles_from_tags_and_text() -> None:
    styles = normalizer.infer_travel_styles(
        title="동강사진박물관 입장료 할인",
        benefit_text="박물관 관람료 할인",
        tags=["사진관", "영월박물관"],
    )

    assert styles == ["체험", "사진"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_travelmonth_normalizer.py -q
```

Expected: fails because `travelmonth_normalizer` does not exist.

- [ ] **Step 3: Implement normalizer**

Create `backend/app/services/travelmonth_normalizer.py`:

```python
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import date, datetime


REGION_ALIASES = {
    "서울특별시": "서울",
    "부산광역시": "부산",
    "대구광역시": "대구",
    "인천광역시": "인천",
    "광주광역시": "광주",
    "대전광역시": "대전",
    "울산광역시": "울산",
    "세종특별자치시": "세종",
    "경기도": "경기",
    "강원특별자치도": "강원",
    "강원도": "강원",
    "충청북도": "충북",
    "충청남도": "충남",
    "전북특별자치도": "전북",
    "전라북도": "전북",
    "전라남도": "전남",
    "경상북도": "경북",
    "경상남도": "경남",
    "제주특별자치도": "제주",
}

STYLE_KEYWORDS = {
    "휴식": ("캠핑", "호텔", "숙박", "템플스테이", "리조트", "사우나", "글램핑"),
    "맛집": ("맛집", "식음료", "음료", "전통주", "음식점", "찜닭"),
    "체험": ("체험", "투어", "박물관", "과학관", "레일파크", "테마파크", "공예"),
    "자연": ("케이블카", "캠핑장", "DMZ", "유람선", "시티투어", "해상", "동굴", "섬"),
    "사진": ("사진", "전망대", "야경", "포토", "핫스팟"),
}


@dataclass(frozen=True)
class RegionResult:
    region: str | None
    city: str | None
    is_nationwide: bool


@dataclass(frozen=True)
class BenefitValue:
    value_text: str | None
    amount_krw: int | None
    discount_percent: int | None
    value_type: str


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def stable_hash(value: str) -> str:
    return hashlib.sha256(normalize_text(value).encode("utf-8")).hexdigest()[:32]


def normalize_region(organizer_text: str, title: str = "", benefit_text: str = "") -> RegionResult:
    parts = [part.strip() for part in organizer_text.split(",") if part.strip()]
    for part in parts:
        if part in REGION_ALIASES:
            city = parts[1] if len(parts) > 1 else None
            return RegionResult(region=REGION_ALIASES[part], city=city, is_nationwide=False)

    searchable = f"{title} {benefit_text}"
    for source, normalized in REGION_ALIASES.items():
        if source in searchable or normalized in searchable:
            return RegionResult(region=normalized, city=None, is_nationwide=False)

    is_nationwide = len(parts) == 1 and parts[0] == "한국관광공사"
    return RegionResult(region=None, city=None, is_nationwide=is_nationwide)


def parse_period(period_text: str) -> tuple[date | None, date | None]:
    matches = re.findall(r"\d{4}-\d{2}-\d{2}", period_text)
    if len(matches) < 2:
        return None, None
    return (
        datetime.strptime(matches[0], "%Y-%m-%d").date(),
        datetime.strptime(matches[1], "%Y-%m-%d").date(),
    )


def normalize_status(status_text: str | None, start_date: date | None, end_date: date | None, today: date) -> str:
    cleaned = status_text or ""
    if "진행중" in cleaned:
        return "active"
    if "종료" in cleaned:
        return "ended"
    if start_date is None or end_date is None:
        return "unknown"
    if today < start_date:
        return "scheduled"
    if today > end_date:
        return "ended"
    return "active"


def _parse_korean_amount(match_text: str) -> int:
    number = int(match_text[:-2].replace(",", ""))
    if match_text.endswith("만원"):
        return number * 10000
    return number * 1000


def extract_benefit_value(benefit_text: str) -> BenefitValue:
    amount_matches = re.findall(r"\d{1,3}(?:,\d{3})*(?:만원|천원)", benefit_text)
    amounts = [_parse_korean_amount(match) for match in amount_matches]
    percent_matches = [int(value) for value in re.findall(r"(\d{1,3})\s*%", benefit_text)]

    if amounts and percent_matches:
        max_amount = max(amounts)
        return BenefitValue(f"최대 {max_amount // 10000}만원" if max_amount >= 10000 else f"{max_amount:,}원", max_amount, max(percent_matches), "mixed")
    if amounts:
        max_amount = max(amounts)
        return BenefitValue(f"최대 {max_amount // 10000}만원" if max_amount >= 10000 else f"{max_amount:,}원", max_amount, None, "amount")
    if percent_matches:
        max_percent = max(percent_matches)
        return BenefitValue(f"최대 {max_percent}%", None, max_percent, "percent")
    if "무료" in benefit_text:
        return BenefitValue("무료", None, None, "free")
    if "업그레이드" in benefit_text:
        return BenefitValue("업그레이드", None, None, "upgrade")
    return BenefitValue(None, None, None, "unknown")


def infer_travel_styles(*, title: str, benefit_text: str, tags: list[str]) -> list[str]:
    searchable = " ".join([title, benefit_text, *tags])
    styles: list[str] = []
    for style, keywords in STYLE_KEYWORDS.items():
        if any(keyword in searchable for keyword in keywords):
            styles.append(style)
    return styles


def calculate_field_completeness(values: dict[str, object | None]) -> int:
    if not values:
        return 0
    filled = sum(1 for value in values.values() if value not in (None, "", []))
    return round(filled / len(values) * 100)
```

- [ ] **Step 4: Run normalizer tests**

Run:

```bash
cd backend
python -m pytest tests/test_travelmonth_normalizer.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/travelmonth_normalizer.py backend/tests/test_travelmonth_normalizer.py
git commit -m "feat: normalize travelmonth benefit fields"
```

---

### Task 4: Parse TravelMonth Regional Benefit Fixtures

**Files:**
- Create: `backend/tests/fixtures/travelmonth_benefit_sample.html`
- Create: `backend/app/services/travelmonth_parser.py`
- Create: `backend/tests/test_travelmonth_parser.py`

- [ ] **Step 1: Add HTML fixture**

Create `backend/tests/fixtures/travelmonth_benefit_sample.html`:

```html
<html>
  <body>
    <section data-benefit-item>
      <p class="organizer">강원특별자치도, 영월군</p>
      <h3>동강사진박물관 여행가는 달 입장료 최대 50% 할인</h3>
      <ul class="tags"><li>#사진관</li><li>#영월박물관</li></ul>
      <p class="period">2026-04-01 ~ 2026-05-31</p>
      <p class="status">[진행중]</p>
      <div class="benefit">동강사진박물관 내·외국인 입장료 50% 할인</div>
      <p class="contact">1577-0545</p>
      <a class="detail" href="https://www.yw.go.kr">자세히 보기</a>
    </section>
    <section data-benefit-item>
      <p class="organizer">전라남도, 강진군</p>
      <h3>2026 강진 누구나 반값 여행</h3>
      <ul class="tags"><li>#강진반값</li><li>#반값여행</li></ul>
      <p class="period">2026-03-19 ~ 2026-05-31</p>
      <p class="status">[진행중]</p>
      <div class="benefit">개인 최대 10만원, 팀 최대 20만원까지 모바일 상품권 환급 지원</div>
      <p class="contact">061-433-3349</p>
      <a class="detail" href="https://www.gangjintour.com">자세히 보기</a>
    </section>
    <section data-benefit-item>
      <p class="organizer">한국관광공사</p>
      <h3>캠핑카 시티투어 최대 3만원 할인</h3>
      <ul class="tags"><li>#캠핑카</li><li>#시티투어</li></ul>
      <p class="period">2026-04-01 ~ 2026-05-31</p>
      <p class="status">[진행중]</p>
      <div class="benefit">캠핑카 시티투어 최대 3만원 할인</div>
      <p class="contact">1668-1141</p>
      <a class="detail" href="https://m.site.naver.com">자세히 보기</a>
    </section>
    <section data-benefit-item>
      <p class="organizer">경기도, 파주시, 디엠지라운지</p>
      <h3>DMZ라운지 루프탑 전망대 무료 개방</h3>
      <ul class="tags"><li>#DMZ</li><li>#전망대</li></ul>
      <p class="period">2026-04-01 ~ 2026-04-30</p>
      <p class="status">[종료]</p>
      <div class="benefit">루프탑 전망대 무료 개방</div>
      <p class="contact">031-000-0000</p>
      <a class="detail" href="https://example.com/dmz">자세히 보기</a>
    </section>
  </body>
</html>
```

- [ ] **Step 2: Write failing parser tests**

Create `backend/tests/test_travelmonth_parser.py`:

```python
from datetime import date, datetime
from pathlib import Path

from app.services.travelmonth_parser import parse_regional_benefits


FIXTURE = Path(__file__).parent / "fixtures" / "travelmonth_benefit_sample.html"


def test_parse_regional_benefits_extracts_expected_records() -> None:
    records = parse_regional_benefits(
        FIXTURE.read_text(encoding="utf-8"),
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        fetched_at=datetime(2026, 5, 21, 9, 0, 0),
        today=date(2026, 5, 21),
    )

    assert len(records) == 4
    first = records[0]
    assert first.title == "동강사진박물관 여행가는 달 입장료 최대 50% 할인"
    assert first.region == "강원"
    assert first.city == "영월군"
    assert first.status == "active"
    assert first.extracted_discount_percent == 50
    assert first.benefit_value_type == "percent"
    assert first.inferred_travel_styles == ["체험", "사진"]
    assert first.detail_url == "https://www.yw.go.kr"


def test_parse_regional_benefits_marks_nationwide_fallback_candidate() -> None:
    records = parse_regional_benefits(
        FIXTURE.read_text(encoding="utf-8"),
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        fetched_at=datetime(2026, 5, 21, 9, 0, 0),
        today=date(2026, 5, 21),
    )

    nationwide = records[2]
    assert nationwide.organizer_text == "한국관광공사"
    assert nationwide.region is None
    assert nationwide.is_nationwide is True
    assert nationwide.extracted_amount_krw == 30000


def test_parse_regional_benefits_keeps_ended_records_but_marks_status() -> None:
    records = parse_regional_benefits(
        FIXTURE.read_text(encoding="utf-8"),
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        fetched_at=datetime(2026, 5, 21, 9, 0, 0),
        today=date(2026, 5, 21),
    )

    ended = records[3]
    assert ended.status == "ended"
    assert ended.freshness_status == "expired"
    assert ended.benefit_value_type == "free"
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_travelmonth_parser.py -q
```

Expected: fails because `travelmonth_parser` does not exist.

- [ ] **Step 4: Implement parser**

Create `backend/app/services/travelmonth_parser.py`:

```python
from __future__ import annotations

import re
from datetime import date, datetime
from html.parser import HTMLParser

from app.schemas.external_sources import TravelMonthRegionalBenefitSource
from app.services.travelmonth_normalizer import (
    calculate_field_completeness,
    extract_benefit_value,
    infer_travel_styles,
    normalize_region,
    normalize_status,
    normalize_text,
    parse_period,
    stable_hash,
)


class _BenefitHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[dict[str, object]] = []
        self._current: dict[str, object] | None = None
        self._field_stack: list[str] = []
        self._tag_items: list[str] = []
        self._link_href: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value for key, value in attrs}
        if tag == "section" and "data-benefit-item" in attr_map:
            self._current = {"raw": "", "tags": []}
            self._tag_items = []
            return
        if self._current is None:
            return
        class_name = attr_map.get("class", "")
        if tag == "p" and class_name in {"organizer", "period", "status", "contact"}:
            self._field_stack.append(class_name)
        elif tag == "h3":
            self._field_stack.append("title")
        elif tag == "div" and class_name == "benefit":
            self._field_stack.append("benefit")
        elif tag == "li":
            self._field_stack.append("tag")
        elif tag == "a" and class_name == "detail":
            self._link_href = attr_map.get("href")
            self._current["detail_url"] = self._link_href

    def handle_endtag(self, tag: str) -> None:
        if self._current is not None and tag == "section":
            self._current["tags"] = list(self._tag_items)
            self.records.append(self._current)
            self._current = None
            self._field_stack.clear()
            self._tag_items = []
            self._link_href = None
            return
        if self._field_stack and tag in {"p", "h3", "div", "li"}:
            self._field_stack.pop()

    def handle_data(self, data: str) -> None:
        if self._current is None:
            return
        text = normalize_text(data)
        if not text:
            return
        self._current["raw"] = normalize_text(f"{self._current.get('raw', '')} {text}")
        if not self._field_stack:
            return
        field = self._field_stack[-1]
        if field == "tag":
            self._tag_items.append(text.lstrip("#"))
            return
        existing = str(self._current.get(field, ""))
        self._current[field] = normalize_text(f"{existing} {text}")


def _freshness_status(status: str) -> str:
    if status == "active":
        return "fresh"
    if status == "ended":
        return "expired"
    return "unknown"


def parse_regional_benefits(
    html: str,
    *,
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> list[TravelMonthRegionalBenefitSource]:
    parser = _BenefitHtmlParser()
    parser.feed(html)
    records: list[TravelMonthRegionalBenefitSource] = []

    for raw_record in parser.records:
        title = str(raw_record.get("title", ""))
        organizer_text = str(raw_record.get("organizer", ""))
        benefit_text = str(raw_record.get("benefit", ""))
        period_text = str(raw_record.get("period", ""))
        status_text = str(raw_record.get("status", "")) or None
        tags = [str(tag) for tag in raw_record.get("tags", [])]
        start_date, end_date = parse_period(period_text)
        status = normalize_status(status_text, start_date, end_date, today)
        region_result = normalize_region(organizer_text, title=title, benefit_text=benefit_text)
        benefit_value = extract_benefit_value(benefit_text)
        organizers = [part.strip() for part in organizer_text.split(",") if part.strip()]
        canonical_source = "|".join([title, organizer_text, period_text])
        raw_detail_text = str(raw_record.get("raw", ""))
        completeness = calculate_field_completeness(
            {
                "title": title,
                "organizer_text": organizer_text,
                "benefit_text": benefit_text,
                "period_text": period_text,
                "status": status,
                "detail_url": raw_record.get("detail_url"),
                "contact": raw_record.get("contact"),
            }
        )
        confidence = 90 if completeness >= 85 and status != "unknown" else 70

        records.append(
            TravelMonthRegionalBenefitSource(
                external_id=stable_hash(f"regional_benefit|{canonical_source}"),
                canonical_key=stable_hash(canonical_source),
                detail_url=str(raw_record.get("detail_url")) if raw_record.get("detail_url") else None,
                collected_page_url=collected_page_url,
                title=title,
                organizer_text=organizer_text,
                organizers=organizers,
                region=region_result.region,
                city=region_result.city,
                is_nationwide=region_result.is_nationwide,
                status_text=status_text,
                status=status,
                start_date=start_date,
                end_date=end_date,
                benefit_text=benefit_text,
                benefit_value_text=benefit_value.value_text,
                extracted_amount_krw=benefit_value.amount_krw,
                extracted_discount_percent=benefit_value.discount_percent,
                benefit_value_type=benefit_value.value_type,
                tags=tags,
                contact_text=str(raw_record.get("contact")) if raw_record.get("contact") else None,
                inferred_travel_styles=infer_travel_styles(title=title, benefit_text=benefit_text, tags=tags),
                confidence=confidence,
                field_completeness=completeness,
                raw_list_text=raw_detail_text,
                raw_detail_text=raw_detail_text,
                raw_payload={"periodText": period_text},
                last_fetched_at=fetched_at,
                last_verified_at=fetched_at if confidence >= 70 else None,
                freshness_status=_freshness_status(status),
            )
        )
    return records
```

- [ ] **Step 5: Run parser tests**

Run:

```bash
cd backend
python -m pytest tests/test_travelmonth_parser.py tests/test_travelmonth_normalizer.py -q
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/travelmonth_parser.py backend/tests/fixtures/travelmonth_benefit_sample.html backend/tests/test_travelmonth_parser.py
git commit -m "feat: parse travelmonth regional benefits"
```

---

### Task 5: Add Repository Upsert

**Files:**
- Create: `backend/app/repositories/external_sources.py`
- Create: `backend/tests/test_external_source_repository.py`

- [ ] **Step 1: Write failing repository tests**

Create `backend/tests/test_external_source_repository.py`:

```python
from datetime import date, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.db.base import Base
from app.repositories import external_sources
from app.schemas.external_sources import TravelMonthRegionalBenefitSource


def make_db() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return Session(engine)


def make_source(title: str = "동강사진박물관 여행가는 달 입장료 최대 50% 할인") -> TravelMonthRegionalBenefitSource:
    return TravelMonthRegionalBenefitSource(
        external_id="external-1",
        canonical_key="canonical-1",
        detail_url="https://www.yw.go.kr",
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        title=title,
        organizer_text="강원특별자치도, 영월군",
        organizers=["강원특별자치도", "영월군"],
        region="강원",
        city="영월군",
        status_text="[진행중]",
        status="active",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 5, 31),
        benefit_text="입장료 50% 할인",
        benefit_value_text="최대 50%",
        extracted_discount_percent=50,
        benefit_value_type="percent",
        tags=["사진관", "영월박물관"],
        contact_text="1577-0545",
        inferred_travel_styles=["체험", "사진"],
        confidence=90,
        field_completeness=100,
        raw_list_text="raw list",
        raw_detail_text="raw detail",
        raw_payload={"periodText": "2026-04-01 ~ 2026-05-31"},
        last_fetched_at=datetime(2026, 5, 21, 9, 0, 0),
        last_verified_at=datetime(2026, 5, 21, 9, 0, 0),
        freshness_status="fresh",
    )


def test_upsert_external_source_records_creates_rows() -> None:
    db = make_db()

    rows = external_sources.upsert_external_source_records(db, [make_source()])

    assert len(rows) == 1
    assert rows[0].canonical_key == "canonical-1"
    assert rows[0].region == "강원"


def test_upsert_external_source_records_updates_existing_row() -> None:
    db = make_db()
    external_sources.upsert_external_source_records(db, [make_source()])

    rows = external_sources.upsert_external_source_records(db, [make_source(title="Updated title")])

    all_rows = external_sources.list_external_source_records(db, source_name="여행가는 달")
    assert len(all_rows) == 1
    assert rows[0].title == "Updated title"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_external_source_repository.py -q
```

Expected: fails because repository module does not exist.

- [ ] **Step 3: Implement repository**

Create `backend/app/repositories/external_sources.py`:

```python
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExternalSourceRecord
from app.schemas.external_sources import TravelMonthRegionalBenefitSource


def _assign_record(record: ExternalSourceRecord, source: TravelMonthRegionalBenefitSource) -> ExternalSourceRecord:
    for field, value in source.model_dump().items():
        setattr(record, field, value)
    return record


def get_external_source_record(
    db: Session,
    *,
    source_name: str,
    source_category: str,
    canonical_key: str,
) -> ExternalSourceRecord | None:
    statement = select(ExternalSourceRecord).where(
        ExternalSourceRecord.source_name == source_name,
        ExternalSourceRecord.source_category == source_category,
        ExternalSourceRecord.canonical_key == canonical_key,
    )
    return db.scalar(statement)


def upsert_external_source_records(
    db: Session,
    sources: list[TravelMonthRegionalBenefitSource],
) -> list[ExternalSourceRecord]:
    rows: list[ExternalSourceRecord] = []
    for source in sources:
        existing = get_external_source_record(
            db,
            source_name=source.source_name,
            source_category=source.source_category,
            canonical_key=source.canonical_key,
        )
        if existing is None:
            existing = ExternalSourceRecord()
            db.add(existing)
        rows.append(_assign_record(existing, source))
    db.flush()
    return rows


def list_external_source_records(
    db: Session,
    *,
    source_name: str,
    status: str | None = None,
    region: str | None = None,
) -> list[ExternalSourceRecord]:
    statement = select(ExternalSourceRecord).where(ExternalSourceRecord.source_name == source_name)
    if status is not None:
        statement = statement.where(ExternalSourceRecord.status == status)
    if region is not None:
        statement = statement.where(ExternalSourceRecord.region == region)
    statement = statement.order_by(ExternalSourceRecord.id)
    return list(db.scalars(statement).all())
```

- [ ] **Step 4: Run repository tests**

Run:

```bash
cd backend
python -m pytest tests/test_external_source_repository.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/repositories/external_sources.py backend/tests/test_external_source_repository.py
git commit -m "feat: upsert external source records"
```

---

### Task 6: Add Collection Service Boundary

**Files:**
- Create: `backend/app/services/travelmonth_collection.py`
- Create: `backend/tests/test_travelmonth_collection.py`

- [ ] **Step 1: Write failing service tests**

Create `backend/tests/test_travelmonth_collection.py`:

```python
from datetime import date, datetime

from app.services.travelmonth_collection import collect_regional_benefits_from_html


class FakeDb:
    pass


def test_collect_regional_benefits_from_html_parses_and_upserts(monkeypatch) -> None:
    captured = {}

    def fake_upsert(db, sources):
        captured["db"] = db
        captured["sources"] = sources
        return sources

    monkeypatch.setattr(
        "app.services.travelmonth_collection.external_source_repository.upsert_external_source_records",
        fake_upsert,
    )

    html = """
    <section data-benefit-item>
      <p class="organizer">강원특별자치도, 영월군</p>
      <h3>동강사진박물관 여행가는 달 입장료 최대 50% 할인</h3>
      <ul class="tags"><li>#사진관</li></ul>
      <p class="period">2026-04-01 ~ 2026-05-31</p>
      <p class="status">[진행중]</p>
      <div class="benefit">입장료 50% 할인</div>
      <p class="contact">1577-0545</p>
    </section>
    """

    db = FakeDb()
    result = collect_regional_benefits_from_html(
        db,
        html,
        fetched_at=datetime(2026, 5, 21, 9, 0, 0),
        today=date(2026, 5, 21),
    )

    assert captured["db"] is db
    assert len(captured["sources"]) == 1
    assert result.created_or_updated_count == 1
    assert result.source_name == "여행가는 달"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_travelmonth_collection.py -q
```

Expected: fails because collection service does not exist.

- [ ] **Step 3: Implement collection service**

Create `backend/app/services/travelmonth_collection.py`:

```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.repositories import external_sources as external_source_repository
from app.services.travelmonth_parser import parse_regional_benefits


TRAVELMONTH_REGIONAL_BENEFIT_URL = "https://korean.visitkorea.or.kr/travelmonth/benefit.do"


@dataclass(frozen=True)
class CollectionResult:
    source_name: str
    source_category: str
    parsed_count: int
    created_or_updated_count: int


def collect_regional_benefits_from_html(
    db: Session,
    html: str,
    *,
    fetched_at: datetime,
    today: date,
) -> CollectionResult:
    sources = parse_regional_benefits(
        html,
        collected_page_url=TRAVELMONTH_REGIONAL_BENEFIT_URL,
        fetched_at=fetched_at,
        today=today,
    )
    rows = external_source_repository.upsert_external_source_records(db, sources)
    return CollectionResult(
        source_name="여행가는 달",
        source_category="regional_benefit",
        parsed_count=len(sources),
        created_or_updated_count=len(rows),
    )
```

- [ ] **Step 4: Run service tests**

Run:

```bash
cd backend
python -m pytest tests/test_travelmonth_collection.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/travelmonth_collection.py backend/tests/test_travelmonth_collection.py
git commit -m "feat: add travelmonth collection service"
```

---

### Task 7: Update Documentation And Checklist

**Files:**
- Modify: `docs/db-schema-current.md`
- Modify: `docs/db-schema-current.sql`
- Modify: `docs/current-work-spec.md`
- Modify: `docs/next-work-plan.md`
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Update schema docs**

In `docs/db-schema-current.md`, add a section for `external_source_records` with these columns:

```markdown
### external_source_records

Stores raw and derived records collected from official external sources before they are converted into internal policy or recommendation inputs.

- `id`: internal numeric id.
- `source_name`, `source_type`, `source_url`, `source_category`: source identity.
- `external_id`, `canonical_key`: idempotent collection keys.
- `detail_url`, `collected_page_url`: source links.
- `title`, `organizer_text`, `organizers`: official text fields.
- `region`, `city`, `is_nationwide`: region derivation and fallback flag.
- `status_text`, `status`, `start_date`, `end_date`: availability and period.
- `benefit_text`, `benefit_value_text`, `extracted_amount_krw`, `extracted_discount_percent`, `benefit_value_type`: benefit normalization.
- `tags`, `contact_text`, `inferred_travel_styles`: recommendation support fields.
- `confidence`, `field_completeness`: parser quality signals.
- `raw_list_text`, `raw_detail_text`, `raw_payload`: raw preservation.
- `last_fetched_at`, `last_verified_at`, `freshness_status`: freshness tracking.
- `created_at`, `updated_at`: row timestamps.
```

In `docs/db-schema-current.sql`, add the table and indexes matching the Alembic migration.

- [ ] **Step 2: Update current work and next work docs**

In `docs/current-work-spec.md`, add a bullet under recent/current work:

```markdown
- 여행가는 달 지역 여행할인 모아보기 외부 수집 기반을 추가해 공식 원천 레코드 저장, 원문 보존, 지역/상태/혜택/취향 파생 필드 생성을 지원한다.
```

In `docs/next-work-plan.md`, add follow-ups:

```markdown
- 여행가는 달 live collector PoC: 공식 페이지에서 HTML을 가져오고 fixture parser와 동일한 결과를 생성하는지 검증한다.
- 외부 수집 scheduler: 캠페인 기간 1일 1회, 마감 14일 이내 12시간 1회, 비시즌 주 1회 기준을 적용한다.
- 홈 지역 추천 API: external source records를 점수화해 상위 3개 지역과 관련 정책 CTA를 제공한다.
- 홈 추천 UI: `AppDataApi` 경계를 통해 추천 카드 3개를 노출한다.
```

- [ ] **Step 3: Update CHECKLIST**

Add a validation line after running the commands in Task 8:

```markdown
- 2026-05-21 travelmonth regional benefit collection foundation: external source record table, parser, normalizer, repository, and collection service were added for 여행가는 달 지역 여행할인 모아보기; validation used `python -m pytest tests/test_db_schema.py tests/test_travelmonth_normalizer.py tests/test_travelmonth_parser.py tests/test_external_source_repository.py tests/test_travelmonth_collection.py -q`, `alembic upgrade head --sql`, `docker compose -f compose.yaml config`, and `git diff --check`.
```

- [ ] **Step 4: Commit docs**

```bash
git add docs/db-schema-current.md docs/db-schema-current.sql docs/current-work-spec.md docs/next-work-plan.md CHECKLIST.md
git commit -m "docs: record travelmonth collection foundation"
```

---

### Task 8: Final Verification

**Files:**
- Read-only verification over all changed files.

- [ ] **Step 1: Run targeted backend tests**

Run:

```bash
cd backend
python -m pytest tests/test_db_schema.py tests/test_travelmonth_normalizer.py tests/test_travelmonth_parser.py tests/test_external_source_repository.py tests/test_travelmonth_collection.py -q
```

Expected: all targeted tests pass.

- [ ] **Step 2: Run Alembic offline SQL**

Run:

```bash
cd backend
alembic upgrade head --sql
```

Expected: command exits 0 and includes the `external_source_records` migration.

- [ ] **Step 3: Run compose config**

Run:

```bash
docker compose -f compose.yaml config
```

Expected: command exits 0.

- [ ] **Step 4: Run whitespace validation**

Run:

```bash
git diff --check
```

Expected: command exits 0.

- [ ] **Step 5: Inspect final status**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: worktree is clean after all commits, and recent commits show the task commits above.

---

## Self-Review

Spec coverage:

- Source metadata: covered by Task 1 DTOs and Task 2 DB columns.
- Raw preservation: covered by `raw_list_text`, `raw_detail_text`, and `raw_payload` in Tasks 1, 2, and 4.
- Region/city/nationwide fallback: covered by Task 3 normalizer tests and Task 4 parser tests.
- Status/date/freshness: covered by Task 3 and Task 4.
- Amount/percent/free/upgrade benefit extraction: covered by Task 3.
- Style inference: covered by Task 3 and Task 4.
- Idempotent upsert by canonical key: covered by Task 5.
- No public API/UI/scheduler in this slice: documented in Scope and follow-up docs in Task 7.

Placeholder scan:

- The plan contains no unresolved placeholder markers, no deferred implementation notes, and no steps that say only "write tests" without concrete test content.

Type consistency:

- Pydantic schema uses snake_case because it is internal backend storage shape, not public API DTO.
- SQLAlchemy model column names are snake_case.
- Repository accepts `TravelMonthRegionalBenefitSource` and persists to `ExternalSourceRecord`.
- Parser returns `TravelMonthRegionalBenefitSource`, collection service upserts those records.
