from __future__ import annotations

import re
from datetime import date, datetime
from html import unescape
from typing import cast
from urllib.parse import urljoin

from app.schemas.external_sources import (
    BenefitValueType,
    ExternalBenefitSource,
    FreshnessStatus,
    SourceStatus,
    TravelStyle,
)
from app.services.travelmonth_normalizer import (
    calculate_field_completeness,
    extract_benefit_value,
    infer_travel_styles,
    normalize_text,
    stable_hash,
)

SOURCE_NAME = "2026 섬 방문의 해"
NOTICE_URL = "https://www.visitisland.kr/brd/notice"
SOURCE_URL = NOTICE_URL
SOURCE_CATEGORY = "regional_benefit"
ORGANIZER_TEXT = "행정안전부, 한국섬진흥원, 한국관광공사"
ORGANIZERS = ["행정안전부", "한국섬진흥원", "한국관광공사"]
DEFAULT_APPLICATION_PERIOD = "2026. 06. 17 오전 10시 ~ 2026. 06. 30"
DEFAULT_TRAVEL_PERIOD = "2026. 07. 01 ~ 2026. 08. 31"
DEFAULT_BENEFIT_TEXT = (
    "성인 누구나 육지와 연결되지 않아 배를 타고 들어가는 섬에서 1박 2일 이상 체류하고 "
    "결제 금액 10만원 이상 이용하면 숙박비, 왕복 배편 승선권, 식비 등 여행비 10만원을 지원받을 수 있습니다. "
    "선정 여부는 개별 문자로 안내되며 여행 후 증빙 서류 검토를 거쳐 계좌이체 방식으로 지급됩니다."
)

_AREA_REGION_MAP: dict[str, tuple[str, ...]] = {
    "경기도": ("경기",),
    "인천광역시": ("인천",),
    "충청남도": ("충남",),
    "전북특별자치도": ("전북",),
    "전남광주통합특별시": ("전남", "광주"),
    "전라남도": ("전남",),
    "광주광역시": ("광주",),
    "경상북도": ("경북",),
    "경상남도": ("경남",),
    "제주특별자치도": ("제주",),
}

_NOTICE_ROW_RE = re.compile(
    r"<tr[^>]*>\s*"
    r"<td[^>]*>\s*(?P<row_number>\d+)\s*</td>\s*"
    r"<td[^>]*onclick=\"location\.href='(?P<href>/brd/notice/(?P<notice_id>\d+))'\"\)?[^>]*>"
    r"(?P<title>.*?)</td>\s*"
    r"<td[^>]*>\s*(?P<notice_date>20\d{2}-\d{2}-\d{2})\s*</td>",
    re.IGNORECASE | re.DOTALL,
)
_TITLE_RE = re.compile(r"\[(?P<area>[^\]]+)\]\s*섬\s*여행비\s*지원\s*혜택\s*(?P<count>\d+)개\s*섬\s*리스트")
_DATE_RE = re.compile(r"(20\d{2})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})")


def parse_island_travel_support_benefits(
    html: str,
    *,
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> list[ExternalBenefitSource]:
    rows = _notice_rows(html)
    records: list[ExternalBenefitSource] = []
    for row in rows:
        parsed_title = _parse_title(row["title"])
        if parsed_title is None:
            continue
        area_text, island_count = parsed_title
        if "전체" in area_text:
            continue
        regions = _regions_from_area(area_text)
        if not regions:
            continue
        notice_date = _parse_iso_date(row["notice_date"])
        for region in regions:
            records.append(
                _build_record(
                    region=region,
                    area_text=area_text,
                    island_count=island_count,
                    notice_id=row["notice_id"],
                    notice_title=row["title"],
                    notice_date=notice_date,
                    detail_url=urljoin(collected_page_url, row["href"]),
                    collected_page_url=collected_page_url,
                    fetched_at=fetched_at,
                    today=today,
                    raw_text=row["raw"],
                )
            )
    return records


def _notice_rows(html: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    seen_notice_ids: set[str] = set()
    for match in _NOTICE_ROW_RE.finditer(html):
        notice_id = match.group("notice_id")
        if notice_id in seen_notice_ids:
            continue
        seen_notice_ids.add(notice_id)
        title = normalize_text(_strip_tags(match.group("title")))
        rows.append(
            {
                "href": match.group("href"),
                "notice_id": notice_id,
                "title": title,
                "notice_date": match.group("notice_date"),
                "raw": normalize_text(_strip_tags(match.group(0))),
            }
        )
    return rows


def _strip_tags(value: str) -> str:
    return normalize_text(unescape(re.sub(r"<[^>]+>", " ", value)))


def _parse_title(title: str) -> tuple[str, int] | None:
    match = _TITLE_RE.search(normalize_text(title))
    if not match:
        return None
    return normalize_text(match.group("area")), int(match.group("count"))


def _regions_from_area(area_text: str) -> list[str]:
    regions: list[str] = []
    for raw_part in re.split(r"[·ㆍ/]", area_text):
        part = normalize_text(raw_part)
        mapped = _AREA_REGION_MAP.get(part, ())
        for region in mapped:
            if region not in regions:
                regions.append(region)
    if not regions and area_text in _AREA_REGION_MAP:
        regions.extend(_AREA_REGION_MAP[area_text])
    return regions


def _parse_iso_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _parse_campaign_date(value: str) -> date | None:
    match = _DATE_RE.search(value)
    if not match:
        return None
    return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))


def _status_from(notice_date: date, campaign_end_date: date | None, today: date) -> SourceStatus:
    if today < notice_date:
        return "scheduled"
    if campaign_end_date and today > campaign_end_date:
        return "ended"
    return "active"


def _freshness_status(status: SourceStatus) -> FreshnessStatus:
    if status == "active":
        return "fresh"
    if status == "ended":
        return "expired"
    return "unknown"


def _build_record(
    *,
    region: str,
    area_text: str,
    island_count: int,
    notice_id: str,
    notice_title: str,
    notice_date: date,
    detail_url: str,
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
    raw_text: str,
) -> ExternalBenefitSource:
    campaign_end_date = _parse_campaign_date(DEFAULT_TRAVEL_PERIOD.split("~")[-1])
    status = _status_from(notice_date, campaign_end_date, today)
    title = f"2026 섬 방문의 해 섬 여행비 지원 - {region}"
    benefit_text = f"{DEFAULT_BENEFIT_TEXT} 대상 섬: {area_text} 권역 {island_count}개 섬."
    benefit_value = extract_benefit_value(benefit_text, title=title)
    benefit_value_type = cast(BenefitValueType, benefit_value.value_type)
    canonical_text = "|".join([SOURCE_NAME, SOURCE_CATEGORY, notice_id, region, DEFAULT_APPLICATION_PERIOD])
    tags = ["섬 여행", "섬 방문의 해", "지역할인", "여행비 지원", "숙박", "배편", region]
    status_text = f"공지중 / 1차 신청 2026.06.17 오전 10시 시작 / 7~8월 여행 지원"
    raw_detail_text = normalize_text(
        f"{notice_title} {notice_date.isoformat()} {DEFAULT_APPLICATION_PERIOD} {DEFAULT_TRAVEL_PERIOD} {benefit_text} {detail_url}"
    )
    inferred_travel_styles = cast(
        list[TravelStyle],
        infer_travel_styles(title=title, benefit_text=benefit_text, tags=tags),
    )
    return ExternalBenefitSource(
        source_name=SOURCE_NAME,
        source_type="official_campaign",
        source_url=SOURCE_URL,
        source_category=SOURCE_CATEGORY,
        external_id=f"visitisland-{notice_id}-{stable_hash(region)[:8]}",
        canonical_key=stable_hash(canonical_text),
        detail_url=detail_url,
        collected_page_url=collected_page_url,
        title=title,
        organizer_text=ORGANIZER_TEXT,
        organizers=ORGANIZERS,
        region=region,
        city=None,
        is_nationwide=False,
        status_text=status_text,
        status=status,
        start_date=notice_date,
        end_date=campaign_end_date,
        benefit_text=benefit_text,
        benefit_value_text=benefit_value.value_text,
        extracted_amount_krw=benefit_value.amount_krw,
        extracted_discount_percent=benefit_value.discount_percent,
        benefit_value_type=benefit_value_type,
        tags=tags,
        contact_text="info@visitisland.kr / 070-4337-5058",
        inferred_travel_styles=inferred_travel_styles,
        confidence=90,
        field_completeness=calculate_field_completeness(
            {
                "title": title,
                "organizer_text": ORGANIZER_TEXT,
                "notice_date": notice_date,
                "status": status,
                "benefit_text": benefit_text,
                "detail_url": detail_url,
                "contact_text": "info@visitisland.kr / 070-4337-5058",
            }
        ),
        raw_list_text=raw_text,
        raw_detail_text=raw_detail_text,
        raw_payload={
            "noticeId": notice_id,
            "noticeTitle": notice_title,
            "noticeDate": notice_date.isoformat(),
            "areaText": area_text,
            "islandCount": island_count,
            "applicationPeriod": DEFAULT_APPLICATION_PERIOD,
            "travelPeriod": DEFAULT_TRAVEL_PERIOD,
            "sourceParser": "visitisland-notice-list",
        },
        last_fetched_at=fetched_at,
        last_verified_at=fetched_at if status == "active" else None,
        freshness_status=_freshness_status(status),
    )
