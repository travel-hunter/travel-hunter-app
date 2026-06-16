from __future__ import annotations

from datetime import datetime

import app.models  # noqa: F401
import pytest
from sqlalchemy import Integer, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models import ExternalSourceRecord
from app.repositories.external_sources import (
    list_external_source_records,
    upsert_external_source_records,
)
from app.schemas.external_sources import TravelMonthRegionalBenefitSource


FETCHED_AT = datetime(2026, 5, 21, 9, 0, 0)
VERIFIED_AT = datetime(2026, 5, 21, 10, 0, 0)


def make_source(**overrides) -> TravelMonthRegionalBenefitSource:
    data = {
        "source_name": "여행가는 달",
        "source_type": "official_campaign",
        "source_url": "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        "source_category": "regional_benefit",
        "external_id": "external-1",
        "canonical_key": "canonical-1",
        "detail_url": "https://www.yw.go.kr",
        "collected_page_url": "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        "title": "영월박물관 사진 체험 할인",
        "organizer_text": "강원특별자치도, 영월군",
        "organizers": ["강원특별자치도", "영월군"],
        "region": "강원",
        "city": "영월군",
        "is_nationwide": False,
        "status_text": "[진행중]",
        "status": "active",
        "start_date": None,
        "end_date": None,
        "benefit_text": "영월박물관 사진관 체험 최대 50% 할인",
        "benefit_value_text": "최대 50% 할인",
        "extracted_amount_krw": None,
        "extracted_discount_percent": 50,
        "benefit_value_type": "percent",
        "tags": ["사진관", "영월박물관"],
        "contact_text": None,
        "inferred_travel_styles": ["체험", "사진"],
        "confidence": 90,
        "field_completeness": 95,
        "raw_list_text": "영월박물관 사진 체험 할인",
        "raw_detail_text": "영월박물관 사진관 체험 최대 50% 할인",
        "raw_payload": {"periodText": "2026-05-01 ~ 2026-05-31"},
        "last_fetched_at": FETCHED_AT,
        "last_verified_at": VERIFIED_AT,
        "freshness_status": "fresh",
    }
    data.update(overrides)
    return TravelMonthRegionalBenefitSource(**data)


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    id_column = ExternalSourceRecord.__table__.c.id
    original_type = id_column.type
    id_column.type = Integer()
    try:
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(bind=engine)
        with TestingSessionLocal() as session:
            yield session
        Base.metadata.drop_all(engine)
    finally:
        id_column.type = original_type


def test_upsert_external_source_records_creates_rows(db: Session) -> None:
    rows = upsert_external_source_records(db, [make_source()])

    assert len(rows) == 1
    listed = list_external_source_records(db, source_name="여행가는 달")
    assert len(listed) == 1
    assert listed[0].canonical_key == "canonical-1"
    assert listed[0].region == "강원"


def test_upsert_external_source_records_updates_existing_row(db: Session) -> None:
    upsert_external_source_records(db, [make_source()])

    rows = upsert_external_source_records(
        db,
        [make_source(title="Updated title")],
    )

    assert rows[0].title == "Updated title"
    listed = list_external_source_records(db, source_name="여행가는 달")
    assert len(listed) == 1
    assert listed[0].title == "Updated title"
