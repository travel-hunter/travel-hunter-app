from datetime import date, datetime, timedelta
from pathlib import Path

import app.models  # noqa: F401
import pytest
from sqlalchemy import Integer, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models import ExternalSourceRecord, Policy
from app.repositories.external_sources import upsert_external_source_records
from app.schemas.external_sources import ExternalBenefitSource
from app.services.region_recommendations import recommend_regions


FETCHED_AT = datetime(2026, 5, 21, 9, 0, 0)


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


def make_source(
    canonical_key: str,
    *,
    region: str,
    title: str,
    source_name: str = "여행가는 달",
    source_category: str = "regional_benefit",
    source_url: str = "https://korean.visitkorea.or.kr/travelmonth/benefits/vacation-benefit.do",
    collected_page_url: str = "https://korean.visitkorea.or.kr/travelmonth/benefits/vacation-benefit.do",
    city: str | None = None,
    amount: int | None = None,
    end_date: date | None = None,
    styles: list[str] | None = None,
    is_nationwide: bool = False,
    status: str = "active",
    freshness_status: str = "fresh",
) -> ExternalBenefitSource:
    return ExternalBenefitSource(
        source_name=source_name,
        source_type="official_campaign",
        source_url=source_url,
        source_category=source_category,
        external_id=canonical_key,
        canonical_key=canonical_key,
        detail_url=None,
        collected_page_url=collected_page_url,
        title=title,
        organizer_text=f"{region} 관광",
        organizers=[f"{region} 관광"],
        region=region,
        city=city,
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


def test_region_recommendations_use_profile_region_only_as_tie_breaker(db: Session) -> None:
    today = date(2026, 5, 21)
    upsert_external_source_records(
        db,
        [
            make_source("busan-1", region="Busan", title="Busan food support", amount=50000, styles=["맛집"]),
            make_source("gangwon-1", region="Gangwon", title="Gangwon food support", amount=50000, styles=["맛집"]),
            make_source("jeju-1", region="Jeju", title="Jeju stronger support", amount=50000, styles=["맛집"]),
            make_source("jeju-2", region="Jeju", title="Jeju second support", amount=50000, styles=["맛집"]),
        ],
    )

    recommendations = recommend_regions(db, today=today, style="맛집", region="Busan", limit=3)

    assert [item.region for item in recommendations] == ["Jeju", "Busan", "Gangwon"]
    assert recommendations[0].policyCount == 2
    assert recommendations[1].policyCount == 1
    assert recommendations[2].policyCount == 1


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


def test_region_recommendations_prefers_profile_region_over_style_match_on_tie(db: Session) -> None:
    today = date(2026, 5, 21)
    upsert_external_source_records(
        db,
        [
            make_source(
                "busan-1",
                region="Busan",
                title="Busan general support",
                amount=10000,
                styles=[],
            ),
            make_source(
                "jeju-1",
                region="Jeju",
                title="Jeju relax support",
                amount=10000,
                styles=["휴식"],
            ),
        ],
    )

    recommendations = recommend_regions(
        db,
        today=today,
        style="휴식",
        region="Busan",
        limit=2,
    )

    assert [item.region for item in recommendations] == ["Busan", "Jeju"]


def test_region_recommendations_include_half_trip_and_exclude_traffic(db: Session) -> None:
    upsert_external_source_records(
        db,
        [
            make_source(
                "half-trip-hapcheon",
                source_name="대한민국 반값여행",
                source_category="local_half_trip",
                source_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
                collected_page_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
                region="경남",
                city="합천",
                title="합천 반값여행 지원",
                amount=200000,
            ),
            make_source(
                "traffic-rail",
                source_category="traffic_benefit",
                source_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
                collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do",
                region="전국",
                title="테마열차 할인",
                is_nationwide=True,
            ),
        ],
    )

    recommendations = recommend_regions(db, today=date(2026, 5, 23), limit=3)

    assert [item.region for item in recommendations] == ["경남"]
    assert recommendations[0].policyCount == 1


def test_region_recommendations_read_records_created_by_travelmonth_collection(db: Session) -> None:
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
        style="맛집",
        region="부산",
        limit=3,
    )

    assert result.parsed_count > 0
    assert result.created_or_updated_count > 0
    assert recommendations
    assert recommendations[0].policyCount > 0
