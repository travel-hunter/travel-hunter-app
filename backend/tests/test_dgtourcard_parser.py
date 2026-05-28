from __future__ import annotations

from datetime import UTC, date, datetime

from app.services.dgtourcard_parser import parse_dgtourcard_benefits


DGTOURCARD_DATA_HTML = """
<html><body>
<a href="javascript:func_go_detail('밀양','1')" data-trvid="1" data-town="밀양"
   data-trvnm="2026-경상남도 밀양" data-link="https://www.mybanhada.com/"
   data-evtbgndt="2026-04-01" data-evtenddt="2026-08-31" data-sttsnm="준비중">밀양</a>
<a href="javascript:func_go_detail('하동','3')" data-trvid="3" data-town="하동"
   data-trvnm="2026-경상남도 하동" data-link="https://hadongtrip.kr/index.php"
   data-evtbgndt="2026-05-20" data-evtenddt="2026-06-30" data-sttsnm="신청접수중">하동</a>
<a href="javascript:func_go_detail('영광','8')" data-trvid="8" data-town="영광"
   data-trvnm="2026-전라남도 영광" data-link="https://www.yeonggwang.go.kr/travel/"
   data-evtbgndt="2026-05-20" data-evtenddt="2026-06-30" data-sttsnm="신청접수중">영광</a>
<a href="javascript:func_go_detail('제천','6')" data-trvid="6" data-town="제천"
   data-trvnm="2026-충청북도 제천" data-link="https://www.jctour.kr/"
   data-evtbgndt="2026-03-01" data-evtenddt="2026-03-31" data-sttsnm="마감">제천</a>
<a href="javascript:func_go_detail('강진','7')" data-trvid="7" data-town="강진"
   data-trvnm="2026-전라남도 강진" data-link=""
   data-evtbgndt="" data-evtenddt="" data-sttsnm="준비중">강진</a>
</body></html>
"""


DGTOURCARD_SECTION_HTML = """
<html><body>
<section>
  <h2>합천 신청접수중</h2>
  <p>신청기간 : 2026.05.20-2026.06.30</p>
  <p>여행기간 : 2026.06.01~2026.06.30</p>
  <p>지원내용 : 숙박, 식사, 체험 여행비 환급</p>
  <p>문의전화 : 055-930-0000</p>
  <a href="/dgtourcard/hapcheon/detail.do">지역 상세 바로가기</a>
</section>
<section>
  <h2>평창 준비중</h2>
  <p>신청기간 : 준비중</p>
  <p>여행기간 : 2026.07.01~2026.08.31</p>
  <a href="https://pc.halftrip.kr">평창 안내</a>
</section>
<section>
  <h2>고창 마감</h2>
  <p>신청기간 : 2026.03.01-2026.03.31</p>
  <p>여행기간 : 2026.04.01~2026.04.30</p>
  <a href="javascript:void(0)">잘못된 링크</a>
</section>
<section>
  <h2>없는지역 신청접수중</h2>
  <p>신청기간 : 2026.05.20-2026.06.30</p>
</section>
</body></html>
"""


def test_parse_dgtourcard_benefits_reads_official_data_attributes() -> None:
    records = parse_dgtourcard_benefits(
        DGTOURCARD_DATA_HTML,
        collected_page_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
        fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        today=date(2026, 5, 23),
    )

    assert [record.city for record in records] == ["밀양", "하동", "영광", "제천", "강진"]
    assert [record.status for record in records] == [
        "scheduled",
        "active",
        "active",
        "ended",
        "scheduled",
    ]
    assert records[1].source_category == "local_half_trip"
    assert records[1].source_name == "대한민국 반값여행"
    assert records[1].title == "하동 대한민국 반값여행 지원"
    assert records[1].region == "경남"
    assert records[1].freshness_status == "fresh"
    assert records[1].benefit_value_text == "최대 20만원 환급"
    assert records[1].detail_url == "https://hadongtrip.kr/index.php"
    assert records[2].detail_url == "https://www.yeonggwang.go.kr/travel/"
    assert records[4].detail_url is None


def test_parse_dgtourcard_benefits_falls_back_to_section_markup() -> None:
    records = parse_dgtourcard_benefits(
        DGTOURCARD_SECTION_HTML,
        collected_page_url="https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
        fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        today=date(2026, 5, 23),
    )

    assert [record.city for record in records] == ["합천", "평창", "고창"]
    assert records[0].status == "active"
    assert records[0].detail_url == "https://korean.visitkorea.or.kr/dgtourcard/hapcheon/detail.do"
    assert records[0].contact_text == "055-930-0000"
    assert records[0].raw_payload["applicationPeriod"] == "2026.05.20-2026.06.30"
    assert records[0].raw_payload["tripPeriod"] == "2026.06.01~2026.06.30"
    assert records[1].status == "scheduled"
    assert records[1].detail_url == "https://pc.halftrip.kr"
    assert records[2].status == "ended"
    assert records[2].detail_url is None
