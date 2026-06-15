from __future__ import annotations

from datetime import UTC, date, datetime

from app.services.visitisland_parser import (
    NOTICE_URL,
    parse_island_travel_support_benefits,
)

NOTICE_LIST_HTML = """
<table>
  <tbody>
    <tr>
      <td>7</td>
      <td style="cursor: pointer;" onclick="location.href='/brd/notice/48'")>[전체] 섬 여행비 지원 혜택 166개 섬 리스트</td>
      <td>2026-06-12</td><td>331</td>
    </tr>
    <tr>
      <td>6</td>
      <td style="cursor: pointer;" onclick="location.href='/brd/notice/47'")>[경기도·인천광역시] 섬 여행비 지원 혜택 25개 섬 리스트</td>
      <td>2026-06-12</td><td>118</td>
    </tr>
    <tr>
      <td>5</td>
      <td style="cursor: pointer;" onclick="location.href='/brd/notice/46'")>[충청남도] 섬 여행비 지원 혜택 13개 섬 리스트</td>
      <td>2026-06-12</td><td>62</td>
    </tr>
    <tr>
      <td>4</td>
      <td style="cursor: pointer;" onclick="location.href='/brd/notice/45'")>[전북특별자치도] 섬 여행비 지원 혜택 11개 섬 리스트</td>
      <td>2026-06-12</td><td>52</td>
    </tr>
    <tr>
      <td>3</td>
      <td style="cursor: pointer;" onclick="location.href='/brd/notice/44'")>[전남광주통합특별시] 섬 여행비 지원 혜택 75개 섬 리스트</td>
      <td>2026-06-12</td><td>113</td>
    </tr>
    <tr>
      <td>2</td>
      <td style="cursor: pointer;" onclick="location.href='/brd/notice/43'")>[경상북도·경상남도] 섬 여행비 지원 혜택 36개 섬 리스트</td>
      <td>2026-06-12</td><td>110</td>
    </tr>
    <tr>
      <td>1</td>
      <td style="cursor: pointer;" onclick="location.href='/brd/notice/42'")>[제주특별자치도] 섬 여행비 지원 혜택 6개 섬 리스트</td>
      <td>2026-06-12</td><td>70</td>
    </tr>
  </tbody>
</table>
"""


def parse(today: date = date(2026, 6, 15)):
    return parse_island_travel_support_benefits(
        NOTICE_LIST_HTML,
        collected_page_url=NOTICE_URL,
        fetched_at=datetime(2026, 6, 15, 9, 0, tzinfo=UTC),
        today=today,
    )


def test_parse_island_travel_support_records_as_regional_benefits() -> None:
    records = parse()

    assert len(records) == 9
    assert {record.region for record in records} == {
        "경기",
        "인천",
        "충남",
        "전북",
        "전남",
        "광주",
        "경북",
        "경남",
        "제주",
    }
    assert all(record.source_name == "2026 섬 방문의 해" for record in records)
    assert all(record.source_url == NOTICE_URL for record in records)
    assert all(record.source_category == "regional_benefit" for record in records)
    assert all(record.status == "active" for record in records)
    assert all(record.freshness_status == "fresh" for record in records)
    assert all(record.extracted_amount_krw == 100_000 for record in records)
    assert all(record.benefit_value_text == "최대 10만원" for record in records)
    assert all(record.detail_url and record.detail_url.startswith("https://www.visitisland.kr/brd/notice/") for record in records)
    replacement_character = chr(0xFFFD)
    assert not any(replacement_character in record.raw_detail_text for record in records)


def test_parse_island_travel_support_excludes_duplicate_total_notice() -> None:
    records = parse()

    assert not any("전체" in str(record.raw_payload.get("areaText")) for record in records)
    assert sum(int(record.raw_payload["islandCount"]) for record in records if record.region in {"경기", "인천"}) == 50


def test_parse_island_travel_support_keeps_canonical_key_stable() -> None:
    first = parse()
    second = parse()

    assert [(record.region, record.canonical_key) for record in first] == [
        (record.region, record.canonical_key) for record in second
    ]


def test_parse_island_travel_support_marks_non_current_records_non_fresh() -> None:
    scheduled = parse(today=date(2026, 6, 1))[0]
    ended = parse(today=date(2026, 9, 1))[0]

    assert scheduled.status == "scheduled"
    assert scheduled.freshness_status == "unknown"
    assert ended.status == "ended"
    assert ended.freshness_status == "expired"


def test_parse_island_travel_support_ignores_malformed_html() -> None:
    records = parse_island_travel_support_benefits(
        "<html><p>섬 여행비 지원 안내</p></html>",
        collected_page_url=NOTICE_URL,
        fetched_at=datetime(2026, 6, 15, 9, 0, tzinfo=UTC),
        today=date(2026, 6, 15),
    )

    assert records == []
