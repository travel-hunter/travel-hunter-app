from datetime import date, datetime, timedelta

import app.models  # noqa: F401
import pytest
from sqlalchemy import Integer, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.data.travel_areas import get_travel_area, list_travel_areas
from app.db.base import Base
from app.models import ExternalSourceRecord, Policy
from app.repositories.external_sources import upsert_external_source_records
from app.schemas.external_sources import ExternalBenefitSource
from app.services.travel_areas import recommend_travel_areas


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
    source_category: str = "local_half_trip",
    city: str | None = None,
    amount: int | None = None,
    end_date: date | None = None,
    tags: list[str] | None = None,
    is_nationwide: bool = False,
    status: str = "active",
    freshness_status: str = "fresh",
    raw_payload: dict[str, object] | None = None,
) -> ExternalBenefitSource:
    return ExternalBenefitSource(
        source_name="대한민국 반값여행",
        source_type="official_campaign",
        source_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
        source_category=source_category,
        external_id=canonical_key,
        canonical_key=canonical_key,
        detail_url=None,
        collected_page_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
        title=title,
        organizer_text=f"{region} 관광",
        organizers=[f"{region} 관광"],
        region=region,
        city=city,
        is_nationwide=is_nationwide,
        status_text="active",
        status=status,
        start_date=date(2026, 5, 1),
        end_date=end_date,
        benefit_text=title,
        benefit_value_text=f"최대 {amount}원 지원" if amount else None,
        extracted_amount_krw=amount,
        extracted_discount_percent=None,
        benefit_value_type="amount" if amount else "unknown",
        tags=tags or [],
        contact_text=None,
        inferred_travel_styles=[],
        confidence=90,
        field_completeness=95,
        raw_list_text=title,
        raw_detail_text=title,
        raw_payload=raw_payload or {"periodText": "2026-05-01 ~ 2026-05-31"},
        last_fetched_at=FETCHED_AT,
        last_verified_at=FETCHED_AT,
        freshness_status=freshness_status,
    )


def test_catalog_contains_representative_nationwide_areas() -> None:
    areas = list_travel_areas()
    ids = {area.id for area in areas}

    assert "jeju-all" in ids
    assert "busan-all" in ids
    assert "gangwon-sokcho-goseong-yangyang" in ids
    assert "jeonnam-yeosu-suncheon" in ids
    assert "gyeongnam-tongyeong-geoje-goseong" in ids
    assert "chungbuk-danyang-jecheon" in ids
    assert len(areas) >= 31


def test_get_travel_area_resolves_id_and_display_fields() -> None:
    area = get_travel_area("gangwon-sokcho-goseong-yangyang")

    assert area is not None
    assert area.name == "속초·고성·양양"
    assert area.sido == "강원"
    assert "고성" in area.included_cities
    assert "설악산" in area.aliases


def test_sido_filter_returns_only_that_sido(db: Session) -> None:
    result = recommend_travel_areas(db, sido="전남", today=date(2026, 5, 26))

    assert result.mode == "sido"
    assert result.sido == "전남"
    assert result.emptyReason is None
    assert result.items
    assert all(item.sido == "전남" for item in result.items)


def test_unsupported_sido_returns_empty_reason(db: Session) -> None:
    result = recommend_travel_areas(db, sido="없는지역", today=date(2026, 5, 26))

    assert result.items == []
    assert result.emptyReason == "unsupported_sido"


def test_search_sokcho_returns_gangwon_area(db: Session) -> None:
    result = recommend_travel_areas(db, query="속초", today=date(2026, 5, 26))

    assert result.mode == "search"
    assert result.items[0].travelAreaId == "gangwon-sokcho-goseong-yangyang"


def test_search_duplicate_goseong_returns_distinct_sidos(db: Session) -> None:
    result = recommend_travel_areas(db, query="고성", today=date(2026, 5, 26))
    pairs = {(item.sido, item.travelAreaId) for item in result.items}

    assert ("강원", "gangwon-sokcho-goseong-yangyang") in pairs
    assert ("경남", "gyeongnam-tongyeong-geoje-goseong") in pairs


def test_query_with_sido_constrains_duplicate_search(db: Session) -> None:
    result = recommend_travel_areas(db, query="고성", sido="강원", today=date(2026, 5, 26))

    assert result.mode == "search"
    assert [item.travelAreaId for item in result.items] == ["gangwon-sokcho-goseong-yangyang"]


def test_nationwide_falls_back_to_catalog_priority_when_no_policy_data(db: Session) -> None:
    result = recommend_travel_areas(db, mode="nationwide", limit=3, today=date(2026, 5, 26))

    assert [item.travelAreaId for item in result.items] == [
        "jeju-all",
        "busan-all",
        "gangwon-sokcho-goseong-yangyang",
    ]


def test_city_policy_boosts_matching_travel_area(db: Session) -> None:
    today = date(2026, 5, 26)
    upsert_external_source_records(
        db,
        [
            make_source("sokcho-city", region="강원", city="속초", title="속초 숙박 할인", amount=50000),
            make_source("gangwon-wide", region="강원", title="강원 전체 관광 할인", amount=30000),
        ],
    )

    result = recommend_travel_areas(db, sido="강원", style="바다", today=today)

    assert result.items[0].travelAreaId == "gangwon-sokcho-goseong-yangyang"
    assert result.items[0].localPolicyCount >= 2
    assert result.items[0].estimatedValueKrw == 80000


def test_ending_soon_and_nationwide_counts_are_reflected(db: Session) -> None:
    today = date(2026, 5, 26)
    upsert_external_source_records(
        db,
        [
            make_source("nationwide", region="전국", title="전국 교통 할인", amount=10000, is_nationwide=True),
            make_source("yeosu", region="전남", city="여수", title="여수 숙박 지원", amount=70000, end_date=today + timedelta(days=3)),
        ],
    )

    result = recommend_travel_areas(db, query="여수", today=today)

    assert result.items[0].travelAreaId == "jeonnam-yeosu-suncheon"
    assert result.items[0].policyCount == 2
    assert result.items[0].localPolicyCount == 1
    assert result.items[0].nationwidePolicyCount == 1
    assert result.items[0].endingSoonCount == 1
    assert result.items[0].score > 0


def test_stay_discount_alias_areas_match_travel_area_cities(db: Session) -> None:
    upsert_external_source_records(
        db,
        [
            make_source(
                "stay-discount",
                source_category="stay_discount",
                region="비수도권 인구감소지역",
                title="2026 대한민국 숙박세일 페스타 숙박 할인",
                amount=70000,
                tags=["숙박"],
                raw_payload={
                    "eligibleAreas": [
                        {"sido": "강원", "cities": ["고성군", "삼척시"]},
                        {"sido": "경남", "cities": ["고성군"]},
                    ],
                    "eligibleAreaCount": 3,
                },
            ),
        ],
    )

    gangwon = recommend_travel_areas(db, query="고성", sido="강원", today=date(2026, 6, 16))
    gyeongnam = recommend_travel_areas(db, query="고성", sido="경남", today=date(2026, 6, 16))

    assert gangwon.items[0].travelAreaId == "gangwon-sokcho-goseong-yangyang"
    assert gangwon.items[0].localPolicyCount == 1
    assert gangwon.items[0].estimatedValueKrw == 70000
    assert gyeongnam.items[0].travelAreaId == "gyeongnam-tongyeong-geoje-goseong"
    assert gyeongnam.items[0].localPolicyCount == 1


def test_travel_areas_hide_stay_canonical_when_alias_payload_missing(db: Session) -> None:
    upsert_external_source_records(
        db,
        [
            make_source(
                "stay-discount",
                source_category="stay_discount",
                region="비수도권 인구감소지역",
                title="2026 대한민국 숙박세일 페스타 숙박 할인",
                amount=70000,
                tags=["숙박"],
                raw_payload={},
            ),
        ],
    )

    result = recommend_travel_areas(db, query="고성", sido="강원", today=date(2026, 6, 16))

    assert result.items[0].travelAreaId == "gangwon-sokcho-goseong-yangyang"
    assert result.items[0].localPolicyCount == 0
    assert result.items[0].estimatedValueKrw == 0
