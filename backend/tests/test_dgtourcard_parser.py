from __future__ import annotations

from datetime import UTC, date, datetime

from app.services.dgtourcard_parser import parse_dgtourcard_benefits


DGTOURCARD_HTML = """
<html><body>
<h2>합천 신청접수중</h2>
<p>신청기간 : 2026.05.20-2026.06.30</p>
<p>여행기간 : 2026.06.01~2026.06.30</p>
<p>지역화폐 : 제로페이 앱</p>
<p>특이사항 : 지정관광지 2개소 방문 인증사진</p>
<p>문의전화 : 055-930-0000</p>
<a href="https://www.hc.go.kr">홈페이지 바로가기</a>
<h2>평창 준비중</h2>
<p>신청기간 : 준비중</p>
<p>여행기간 : 2026.07.01~2026.08.31</p>
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

    assert [record.source_category for record in records] == [
        "local_half_trip",
        "local_half_trip",
    ]
    assert records[0].title == "합천 반값여행 지원"
    assert records[0].region == "경남"
    assert records[0].city == "합천"
    assert records[0].status == "active"
    assert records[0].benefit_value_text == "최대 20만원 환급"
    assert records[0].detail_url == "https://www.hc.go.kr"
    assert records[0].contact_text == "055-930-0000"
    assert records[0].raw_payload["tripPeriod"] == "2026.06.01~2026.06.30"
    assert records[1].title == "평창 반값여행 지원"
    assert records[1].region == "강원"
    assert records[1].status == "scheduled"
