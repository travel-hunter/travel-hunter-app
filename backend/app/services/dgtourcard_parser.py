from __future__ import annotations

from datetime import date, datetime
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from app.schemas.external_sources import ExternalBenefitSource
from app.services.travelmonth_normalizer import normalize_text, parse_period, stable_hash


SOURCE_NAME = "대한민국 반값여행"
SOURCE_URL = "https://korean.visitkorea.or.kr/dgtourcard/tour50.do"
SOURCE_CATEGORY = "local_half_trip"
DEFAULT_BENEFIT_TEXT = (
    "숙박, 식사, 체험 등 여행 중 사용한 금액의 50%를 환급받을 수 있으며 "
    "1명 최대 10만원, 2명 이상 최대 20만원까지 지원됩니다."
)

CITY_REGION = {
    "밀양": "경남",
    "평창": "강원",
    "하동": "경남",
    "거창": "경남",
    "영월": "강원",
    "제천": "충북",
    "강진": "전남",
    "영광": "전남",
    "합천": "경남",
    "해남": "전남",
    "남해": "경남",
    "영암": "전남",
    "고흥": "전남",
    "횡성": "강원",
    "완도": "전남",
    "고창": "전북",
}


class _DgTourCardHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.data_records: list[dict[str, object]] = []
        self.section_records: list[dict[str, object]] = []
        self._current: dict[str, object] | None = None
        self._capture_heading = False
        self._capture_paragraph = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value for key, value in attrs if key}
        if attr_map.get("data-trvid") and (
            attr_map.get("data-town")
            or attr_map.get("data-trvnm")
            or attr_map.get("data-sttsnm")
        ):
            self.data_records.append(dict(attr_map))
            return

        if tag in {"h2", "h3"}:
            self._finish_current()
            self._current = {"raw": ""}
            self._capture_heading = True
            return

        if self._current is None:
            return
        if tag == "p":
            self._capture_paragraph = True
        elif tag == "a" and attr_map.get("href") and not self._current.get("detail_url"):
            self._current["detail_url"] = attr_map["href"]

    def handle_endtag(self, tag: str) -> None:
        if tag in {"h2", "h3"}:
            self._capture_heading = False
        elif tag == "p":
            self._capture_paragraph = False

    def handle_data(self, data: str) -> None:
        text = normalize_text(data)
        if not text or self._current is None:
            return
        self._current["raw"] = normalize_text(f"{self._current.get('raw', '')} {text}")
        if self._capture_heading:
            self._current["heading"] = text
        elif self._capture_paragraph:
            paragraphs = self._current.setdefault("paragraphs", [])
            if isinstance(paragraphs, list):
                paragraphs.append(text)

    def close(self) -> None:
        super().close()
        self._finish_current()

    def _finish_current(self) -> None:
        if self._current and self._current.get("heading"):
            self.section_records.append(self._current)
        self._current = None


def parse_dgtourcard_benefits(
    html: str,
    *,
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> list[ExternalBenefitSource]:
    parser = _DgTourCardHtmlParser()
    parser.feed(html)
    parser.close()

    if parser.data_records:
        unique_data_records: dict[str, dict[str, object]] = {}
        for raw_record in parser.data_records:
            key = str(raw_record.get("data-trvid") or raw_record.get("data-town") or "")
            if not key:
                continue
            existing = unique_data_records.get(key)
            if existing is None or (
                not existing.get("data-sttsnm") and raw_record.get("data-sttsnm")
            ) or (
                not existing.get("data-link") and raw_record.get("data-link")
            ):
                unique_data_records[key] = raw_record
        return [
            record
            for raw_record in unique_data_records.values()
            if (record := _record_from_data_attrs(raw_record, collected_page_url, fetched_at, today))
            is not None
        ]

    return [
        record
        for raw_record in parser.section_records
        if (record := _record_from_section(raw_record, collected_page_url, fetched_at, today))
        is not None
    ]


def _record_from_data_attrs(
    raw_record: dict[str, object],
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> ExternalBenefitSource | None:
    city = _city_from_data_attrs(raw_record)
    if city not in CITY_REGION:
        return None
    status_text = normalize_text(str(raw_record.get("data-sttsnm") or ""))
    application_period = _period_from_dates(
        raw_record.get("data-evtbgndt"),
        raw_record.get("data-evtenddt"),
    )
    start_date, end_date = _parse_application_period(application_period)
    detail_url = _absolute_detail_url(raw_record.get("data-link"), collected_page_url)
    status = _status_from(status_text, application_period, start_date, end_date, today)
    raw_text = normalize_text(" ".join(str(value or "") for value in raw_record.values()))
    return _build_record(
        city=city,
        status_text=status_text,
        application_period=application_period,
        trip_period=None,
        contact_text=None,
        detail_url=detail_url,
        start_date=start_date,
        end_date=end_date,
        status=status,
        raw_text=raw_text,
        raw_payload=dict(raw_record),
        fetched_at=fetched_at,
    )


def _record_from_section(
    raw_record: dict[str, object],
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> ExternalBenefitSource | None:
    heading = str(raw_record.get("heading", ""))
    city, status_text = _split_heading(heading)
    if city not in CITY_REGION:
        return None
    paragraphs = [
        str(item) for item in raw_record.get("paragraphs", []) if str(item).strip()
    ]
    application_period = _value_after_label(paragraphs, "신청기간")
    trip_period = _value_after_label(paragraphs, "여행기간") or _value_after_label(
        paragraphs,
        "여행일정",
    )
    contact_text = _value_after_label(paragraphs, "문의전화")
    detail_url = _absolute_detail_url(raw_record.get("detail_url"), collected_page_url)
    start_date, end_date = _parse_application_period(application_period)
    status = _status_from(status_text, application_period, start_date, end_date, today)
    raw_payload: dict[str, object] = {
        "applicationPeriod": application_period,
        "tripPeriod": trip_period,
    }
    if detail_url:
        raw_payload["detailUrl"] = detail_url
    return _build_record(
        city=city,
        status_text=status_text,
        application_period=application_period,
        trip_period=trip_period,
        contact_text=contact_text,
        detail_url=detail_url,
        start_date=start_date,
        end_date=end_date,
        status=status,
        raw_text=str(raw_record.get("raw", "")),
        raw_payload=raw_payload,
        fetched_at=fetched_at,
    )


def _build_record(
    *,
    city: str,
    status_text: str | None,
    application_period: str | None,
    trip_period: str | None,
    contact_text: str | None,
    detail_url: str | None,
    start_date: date | None,
    end_date: date | None,
    status: str,
    raw_text: str,
    raw_payload: dict[str, object],
    fetched_at: datetime,
) -> ExternalBenefitSource:
    canonical_text = "|".join(
        [SOURCE_CATEGORY, city, application_period or "", trip_period or ""]
    )
    return ExternalBenefitSource(
        source_name=SOURCE_NAME,
        source_type="official_campaign",
        source_url=SOURCE_URL,
        source_category=SOURCE_CATEGORY,
        external_id=stable_hash(canonical_text),
        canonical_key=stable_hash(canonical_text),
        detail_url=detail_url,
        collected_page_url=SOURCE_URL,
        title=f"{city} 대한민국 반값여행 지원",
        organizer_text=f"{city} 지자체",
        organizers=[f"{city} 지자체", "한국관광공사"],
        region=CITY_REGION[city],
        city=city,
        is_nationwide=False,
        status_text=status_text or application_period,
        status=status,
        start_date=start_date,
        end_date=end_date,
        benefit_text=DEFAULT_BENEFIT_TEXT,
        benefit_value_text="최대 20만원 환급",
        extracted_amount_krw=200000,
        extracted_discount_percent=50,
        benefit_value_type="mixed",
        tags=["지역할인", city, status_text or status],
        contact_text=contact_text,
        inferred_travel_styles=["체험"],
        confidence=90 if application_period or status_text else 70,
        field_completeness=90 if application_period or status_text else 70,
        raw_list_text=raw_text,
        raw_detail_text=raw_text,
        raw_payload=raw_payload,
        last_fetched_at=fetched_at,
        last_verified_at=fetched_at if status in {"active", "scheduled"} else None,
        freshness_status="fresh" if status == "active" else "unknown",
    )


def _city_from_data_attrs(raw_record: dict[str, object]) -> str:
    city = normalize_text(str(raw_record.get("data-town") or ""))
    if city:
        return city.removesuffix("시").removesuffix("군")
    title = normalize_text(str(raw_record.get("data-trvnm") or ""))
    for known_city in CITY_REGION:
        if known_city in title:
            return known_city
    return ""


def _period_from_dates(start_value: object, end_value: object) -> str | None:
    start_text = normalize_text(str(start_value or ""))
    end_text = normalize_text(str(end_value or ""))
    if not start_text or not end_text:
        return None
    return f"{start_text}~{end_text}"


def _absolute_detail_url(value: object, collected_page_url: str) -> str | None:
    detail_url = normalize_text(str(value or ""))
    if not detail_url or detail_url.startswith(("javascript:", "#")):
        return None
    absolute_url = urljoin(collected_page_url, detail_url)
    scheme = urlparse(absolute_url).scheme.lower()
    if scheme not in {"http", "https"}:
        return None
    return absolute_url


def _split_heading(value: str) -> tuple[str, str | None]:
    normalized = normalize_text(value)
    for status in ("신청접수중", "준비중", "예정", "마감"):
        if normalized.endswith(status):
            return normalize_text(normalized.removesuffix(status)), status
    parts = normalized.split()
    if not parts:
        return "", None
    return parts[0], " ".join(parts[1:]) or None


def _value_after_label(values: list[str], label: str) -> str | None:
    for value in values:
        if label in value:
            return normalize_text(value.split(":", 1)[-1])
    return None


def _parse_application_period(value: str | None) -> tuple[date | None, date | None]:
    if not value or any(token in value for token in ("준비중", "예정", "미정")):
        return None, None
    try:
        return parse_period(value)
    except ValueError:
        return None, None


def _status_from(
    status_text: str | None,
    application_period: str | None,
    start_date: date | None,
    end_date: date | None,
    today: date,
) -> str:
    text = " ".join(part for part in [status_text, application_period] if part)
    if "마감" in text:
        return "ended"
    if "신청접수중" in text:
        return "active"
    if "준비중" in text or "예정" in text:
        return "scheduled"
    if start_date and end_date:
        if today < start_date:
            return "scheduled"
        if today > end_date:
            return "ended"
        return "active"
    return "unknown"
