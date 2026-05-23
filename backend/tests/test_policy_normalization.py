from __future__ import annotations

import app.models  # noqa: F401
import pytest
from sqlalchemy import Integer, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models import ExternalSourceRecord, Policy
from app.repositories.external_sources import upsert_external_source_records
from app.repositories.policies import get_policy_by_slug
from app.schemas.external_sources import ExternalBenefitSource, TravelMonthRegionalBenefitSource


def make_source(**overrides) -> TravelMonthRegionalBenefitSource:
    data = {
        "source_type": "official_campaign",
        "source_url": "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        "source_category": "regional_benefit",
        "external_id": "external-1",
        "canonical_key": "canonical-1",
        "detail_url": "https://example.com/detail",
        "collected_page_url": "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        "title": "Official regional benefit",
        "organizer_text": "Official organizer",
        "organizers": ["Official organizer"],
        "region": "Busan",
        "city": None,
        "is_nationwide": False,
        "status_text": "active",
        "status": "active",
        "start_date": None,
        "end_date": None,
        "benefit_text": "Official benefit text",
        "benefit_value_text": "Up to 50,000 KRW",
        "extracted_amount_krw": 50000,
        "extracted_discount_percent": None,
        "benefit_value_type": "amount",
        "tags": [],
        "contact_text": None,
        "inferred_travel_styles": [],
        "confidence": 90,
        "field_completeness": 90,
        "raw_list_text": "Official regional benefit",
        "raw_detail_text": "Official benefit detail",
        "raw_payload": {},
        "last_fetched_at": "2026-05-22T09:00:00",
        "last_verified_at": "2026-05-22T10:00:00",
        "freshness_status": "fresh",
    }
    data.update(overrides)
    return TravelMonthRegionalBenefitSource(**data)


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    patched_columns = [
        ExternalSourceRecord.__table__.c.id,
        Policy.__table__.c.id,
    ]
    original_types = [column.type for column in patched_columns]
    for column in patched_columns:
        column.type = Integer()
    try:
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(bind=engine)
        with TestingSessionLocal() as session:
            yield session
        Base.metadata.drop_all(engine)
    finally:
        for column, original_type in zip(patched_columns, original_types, strict=True):
            column.type = original_type


def test_promotes_active_fresh_external_record_to_policy(db: Session) -> None:
    rows = upsert_external_source_records(
        db,
        [
            make_source(
                title="Busan official benefit",
                region="Busan",
                canonical_key="busan-benefit",
                external_id="busan-benefit",
                benefit_value_text="Up to 50,000 KRW",
                extracted_amount_krw=50000,
            )
        ],
    )

    from app.services.policy_normalization import promote_external_benefits_to_policies

    result = promote_external_benefits_to_policies(db)

    assert result.promoted_count == 1
    policy = get_policy_by_slug(db, f"travelmonth-{rows[0].id}")
    assert policy is not None
    assert policy.title == "Busan official benefit"
    assert policy.region == "Busan"
    assert policy.benefit_amount == 50000
    assert policy.external_source_record_id == rows[0].id
    assert policy.source_category == "regional_benefit"
    assert policy.verification_status == "fresh"

    from app.services.policies import policy_to_api

    assert policy_to_api(policy)["sourceType"] == "external"


def test_promotion_is_idempotent_by_external_source_record_id(db: Session) -> None:
    rows = upsert_external_source_records(db, [make_source(canonical_key="stable")])

    from app.services.policy_normalization import promote_external_benefits_to_policies

    first = promote_external_benefits_to_policies(db)
    second = promote_external_benefits_to_policies(db)

    assert first.promoted_count == 1
    assert second.promoted_count == 1
    assert len(db.query(Policy).filter(Policy.external_source_record_id == rows[0].id).all()) == 1


def test_skips_inactive_or_stale_records(db: Session) -> None:
    upsert_external_source_records(
        db,
        [
            make_source(canonical_key="inactive", status="ended"),
            make_source(canonical_key="stale", freshness_status="stale"),
        ],
    )

    from app.services.policy_normalization import promote_external_benefits_to_policies

    result = promote_external_benefits_to_policies(db)

    assert result.promoted_count == 0
    assert db.query(Policy).count() == 0


def test_upsert_accepts_non_regional_external_source(db: Session) -> None:
    source = ExternalBenefitSource(
        source_name="여행가는 달",
        source_type="official_campaign",
        source_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
        source_category="traffic_benefit",
        external_id="traffic-rail-1",
        canonical_key="traffic-rail-1",
        detail_url="https://www.korail.com",
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
        title="TravelMonth rail discount",
        organizer_text="Korail",
        organizers=["Korail"],
        region="Nationwide",
        city=None,
        is_nationwide=True,
        status_text="active",
        status="active",
        start_date=None,
        end_date=None,
        benefit_text="Theme train fare 50% discount",
        benefit_value_text="50% discount",
        extracted_amount_krw=None,
        extracted_discount_percent=50,
        benefit_value_type="percent",
        tags=["traffic", "rail"],
        contact_text="Korail customer center",
        inferred_travel_styles=[],
        confidence=90,
        field_completeness=90,
        raw_list_text="Theme train fare 50% discount",
        raw_detail_text="Theme train fare 50% discount",
        raw_payload={"source": "traffic"},
        last_fetched_at="2026-05-23T09:00:00",
        last_verified_at="2026-05-23T09:00:00",
        freshness_status="fresh",
    )

    rows = upsert_external_source_records(db, [source])

    assert len(rows) == 1
    assert rows[0].source_category == "traffic_benefit"
    assert rows[0].benefit_value_type == "percent"
