from __future__ import annotations

from datetime import UTC, date, datetime

from app.services.travelmonth_stay_parser import parse_stay_discount_benefits


STAY_HTML = """
<html><body>
<section data-stay-discount>
  <h2>2026 대한민국 숙박세일 페스타</h2>
  <p>쿠폰 발급기간 : 2026.6.11 ~ 2026.7.31 예산 소진 시 조기 종료</p>
  <p>입실기간 : 6월 11일 ~ 7월 31일</p>
  <p>할인혜택 : 비수도권 숙박상품 2/3/5/7만원 할인권 지원</p>
  <a href="/travelmonth/benefits/stay.do">자세히 보기</a>
</section>
</body></html>
"""


def test_parse_stay_discount_benefits_extracts_amount_period_and_raw_payload() -> None:
    records = parse_stay_discount_benefits(
        STAY_HTML,
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/stay.do",
        fetched_at=datetime(2026, 6, 12, tzinfo=UTC),
        today=date(2026, 6, 12),
    )

    assert len(records) == 1
    record = records[0]
    assert record.source_name == "대한민국 숙박세일 페스타"
    assert record.source_category == "stay_discount"
    assert record.status == "active"
    assert record.freshness_status == "fresh"
    assert record.start_date == date(2026, 6, 11)
    assert record.end_date == date(2026, 7, 31)
    assert record.benefit_value_type == "amount"
    assert record.extracted_amount_krw == 70000
    assert record.benefit_value_text == "2/3/5/7만원 할인권"
    assert {"숙박", "숙박세일", "비수도권"}.issubset(set(record.tags))
    assert record.region == "비수도권·인구감소지역"
    assert record.raw_payload["issuePeriod"].startswith("2026.6.11")
    assert record.raw_payload["stayPeriod"].startswith("6월 11일")
    assert record.raw_payload["earlyCloseWarning"] is True


def test_parse_stay_discount_benefits_uses_fallback_text_record() -> None:
    records = parse_stay_discount_benefits(
        "<html><body>숙박세일 페스타 입실기간 : 6월 11일 ~ 7월 31일 혜택 : 5만원 숙박 할인</body></html>",
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefits/stay.do",
        fetched_at=datetime(2026, 6, 10, tzinfo=UTC),
        today=date(2026, 6, 10),
    )

    assert len(records) == 1
    assert records[0].status == "scheduled"
    assert records[0].is_nationwide is True
