from datetime import date, datetime, timedelta

import app.models  # noqa: F401
import pytest
from sqlalchemy import Integer, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models import ExternalSourceRecord
from app.repositories.external_sources import upsert_external_source_records
from app.schemas.external_sources import TravelMonthRegionalBenefitSource
from app.services.region_recommendations import recommend_regions


FETCHED_AT = datetime(2026, 5, 21, 9, 0, 0)


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


def make_source(
    canonical_key: str,
    *,
    region: str,
    title: str,
    amount: int | None = None,
    end_date: date | None = None,
    styles: list[str] | None = None,
    is_nationwide: bool = False,
    status: str = "active",
    freshness_status: str = "fresh",
) -> TravelMonthRegionalBenefitSource:
    return TravelMonthRegionalBenefitSource(
        source_name="여행가는 달",
        source_type="official_campaign",
        source_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        source_category="regional_benefit",
        external_id=canonical_key,
        canonical_key=canonical_key,
        detail_url=None,
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        title=title,
        organizer_text=f"{region} 관광",
        organizers=[f"{region} 관광"],
        region=region,
        city=None,
        is_nationwide=is_nationwide,
        status_text="[진행중]",
        status=status,
        start_date=date(2026, 5, 1),
        end_date=end_date,
        benefit_text=title,
        benefit_value_text=f"최대 {amount}원 지원" if amount else None,
        extracted_amount_krw=amount,
        extracted_discount_percent=None,
        benefit_value_type="amount" if amount else "unknown",
        tags=styles or [],
        contact_text=None,
        inferred_travel_styles=styles or [],
        confidence=90,
        field_completeness=95,
        raw_list_text=title,
        raw_detail_text=title,
        raw_payload={"periodText": "2026-05-01 ~ 2026-05-31"},
        last_fetched_at=FETCHED_AT,
        last_verified_at=FETCHED_AT,
        freshness_status=freshness_status,
    )


def test_region_recommendations_rank_by_count_deadline_then_amount(db: Session) -> None:
    today = date(2026, 5, 21)
    upsert_external_source_records(
        db,
        [
            make_source("busan-1", region="부산", title="부산 숙박 5만원 지원", amount=50000, end_date=today + timedelta(days=3)),
            make_source("busan-2", region="부산", title="부산 체험 3만원 지원", amount=30000, end_date=today + timedelta(days=30)),
            make_source("gangwon-1", region="강원", title="강원 자연 체험 20만원 지원", amount=200000, end_date=today + timedelta(days=2)),
            make_source("jeju-1", region="제주", title="제주 맛집 할인", amount=10000, end_date=today + timedelta(days=40)),
        ],
    )

    recommendations = recommend_regions(db, today=today, limit=3)

    assert [item.region for item in recommendations] == ["부산", "강원", "제주"]
    assert recommendations[0].policyCount == 2
    assert recommendations[0].endingSoonCount == 1
    assert recommendations[0].estimatedValueKrw == 80000
    assert recommendations[0].score > recommendations[1].score


def test_region_recommendations_keep_style_bonus_from_overriding_policy_score(db: Session) -> None:
    today = date(2026, 5, 21)
    upsert_external_source_records(
        db,
        [
            make_source("gangwon-1", region="강원", title="강원 숙박 지원", amount=50000, styles=["자연"]),
            make_source("gangwon-2", region="강원", title="강원 체험 지원", amount=50000, styles=["체험"]),
            make_source("busan-1", region="부산", title="부산 맛집 지원", amount=50000, styles=["맛집"]),
        ],
    )

    recommendations = recommend_regions(db, today=today, style="맛집", limit=2)

    assert [item.region for item in recommendations] == ["강원", "부산"]
    assert recommendations[1].styleMatchedCount == 1


def test_region_recommendations_use_nationwide_only_as_fallback(db: Session) -> None:
    today = date(2026, 5, 21)
    upsert_external_source_records(
        db,
        [
            make_source("busan-1", region="부산", title="부산 숙박 지원"),
            make_source("gangwon-1", region="강원", title="강원 체험 지원"),
            make_source("nationwide-1", region="전국", title="전국 교통 지원", is_nationwide=True),
        ],
    )

    two_items = recommend_regions(db, today=today, limit=2)
    three_items = recommend_regions(db, today=today, limit=3)

    assert [item.region for item in two_items] == ["강원", "부산"]
    assert [item.region for item in three_items] == ["강원", "부산", "전국"]


def test_region_recommendations_ignore_inactive_or_stale_records(db: Session) -> None:
    today = date(2026, 5, 21)
    upsert_external_source_records(
        db,
        [
            make_source("active-1", region="부산", title="부산 활성 혜택"),
            make_source("ended-1", region="강원", title="강원 종료 혜택", status="ended", freshness_status="expired"),
            make_source("stale-1", region="제주", title="제주 오래된 혜택", freshness_status="stale"),
        ],
    )

    recommendations = recommend_regions(db, today=today, limit=3)

    assert [item.region for item in recommendations] == ["부산"]
