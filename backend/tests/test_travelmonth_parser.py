from datetime import date, datetime
from pathlib import Path

from app.services.travelmonth_parser import parse_regional_benefits


FIXTURE = Path(__file__).parent / "fixtures" / "travelmonth_benefit_sample.html"
FETCHED_AT = datetime(2026, 5, 21, 9, 0, 0)


def _parse_fixture():
    return parse_regional_benefits(
        FIXTURE.read_text(encoding="utf-8"),
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        fetched_at=FETCHED_AT,
        today=date(2026, 5, 21),
    )


def test_parse_regional_benefits_extracts_expected_records() -> None:
    records = _parse_fixture()

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
    assert first.last_verified_at == FETCHED_AT


def test_parse_regional_benefits_marks_nationwide_fallback_candidate() -> None:
    records = _parse_fixture()

    nationwide = records[2]
    assert nationwide.organizer_text == "한국관광공사"
    assert nationwide.region is None
    assert nationwide.is_nationwide is True
    assert nationwide.extracted_amount_krw == 30000


def test_parse_regional_benefits_keeps_ended_records_but_marks_status() -> None:
    records = _parse_fixture()

    ended = records[3]
    assert ended.status == "ended"
    assert ended.freshness_status == "expired"
    assert ended.benefit_value_type == "free"


def test_parse_regional_benefits_skips_incomplete_sections() -> None:
    html = """
    <section data-benefit-item>
      <p class="organizer">강원특별자치도, 영월군</p>
      <p class="period">2026-04-01 ~ 2026-05-31</p>
      <p class="status">[진행중]</p>
      <a class="detail" href="https://www.yw.go.kr">자세히 보기</a>
    </section>
    """

    records = parse_regional_benefits(
        html,
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        fetched_at=FETCHED_AT,
        today=date(2026, 5, 21),
    )

    assert records == []


def test_parse_regional_benefits_skips_invalid_period_dates() -> None:
    html = """
    <section data-benefit-item>
      <p class="organizer">강원특별자치도, 영월군</p>
      <h3>동강사진박물관 여행가는 달 입장료 최대 50% 할인</h3>
      <p class="period">2026-02-31 ~ 2026-03-10</p>
      <p class="status">[진행중]</p>
      <div class="benefit">동강사진박물관 입장료 최대 50% 할인</div>
      <a class="detail" href="https://www.yw.go.kr">자세히 보기</a>
    </section>
    """

    records = parse_regional_benefits(
        html,
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        fetched_at=FETCHED_AT,
        today=date(2026, 5, 21),
    )

    assert records == []
