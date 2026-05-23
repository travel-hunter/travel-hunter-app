from __future__ import annotations

from datetime import date, datetime
from html.parser import HTMLParser

from app.schemas.external_sources import ExternalBenefitSource
from app.services.travelmonth_normalizer import normalize_text, parse_period, stable_hash

SOURCE_NAME = "대한민국 반값여행"
SOURCE_URL = "https://korean.visitkorea.or.kr/dgtourcard/tour50.do"
SOURCE_CATEGORY = "local_half_trip"
DEFAULT_BENEFIT_TEXT = (
    "숙박, 식사, 체험 등 여행 중 사용한 금액의 50%를 환급받을 수 있으며 "
    "1인 최대 10만원, 2인 이상 최대 20만원까지 지원됩니다."
)

CITY_REGION = {
    "합천": "경남",
    "거창": "경남",
    "하동": "경남",
    "남해": "경남",
    "밀양": "경남",
    "평창": "강원",
    "영월": "강원",
    "횡성": "강원",
    "제천": "충북",
    "강진": "전남",
    "영광": "전남",
    "해남": "전남",
    "영암": "전남",
    "고흥": "전남",
    "완도": "전남",
    "고창": "전북",
}


class _DgTourCardHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[dict[str, object]] = []
        self._current: dict[str, object] | None = None
        self._capture_heading = False
        self._capture_paragraph = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value for key, value in attrs}
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
            self.records.append(self._current)
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

    records: list[ExternalBenefitSource] = []
    for raw_record in parser.records:
        heading = str(raw_record.get("heading", ""))
        city, status_text = _split_heading(heading)
        if city not in CITY_REGION:
            continue
        paragraphs = [
            str(item) for item in raw_record.get("paragraphs", []) if str(item).strip()
        ]
        application_period = _value_after_label(paragraphs, "신청기간")
        trip_period = _value_after_label(paragraphs, "여행기간") or _value_after_label(
            paragraphs,
            "여행일정",
        )
        contact_text = _value_after_label(paragraphs, "문의전화")
        detail_url = str(raw_record.get("detail_url", "")) or None
        start_date, end_date = _parse_application_period(application_period)
        status = _status_from(status_text, application_period, start_date, end_date, today)
        title = f"{city} 반값여행 지원"
        raw_text = str(raw_record.get("raw", ""))
        canonical_text = "|".join(
            [SOURCE_CATEGORY, city, application_period or "", trip_period or ""]
        )
        records.append(
            ExternalBenefitSource(
                source_name=SOURCE_NAME,
                source_type="official_campaign",
                source_url=SOURCE_URL,
                source_category=SOURCE_CATEGORY,
                external_id=stable_hash(canonical_text),
                canonical_key=stable_hash(canonical_text),
                detail_url=detail_url,
                collected_page_url=collected_page_url,
                title=title,
                organizer_text=f"{city} 지자체",
                organizers=[f"{city} 지자체", "한국관광공사"],
                region=CITY_REGION.get(city),
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
                raw_payload={
                    "applicationPeriod": application_period,
                    "tripPeriod": trip_period,
                },
                last_fetched_at=fetched_at,
                last_verified_at=fetched_at if status in {"active", "scheduled"} else None,
                freshness_status="fresh" if status == "active" else "unknown",
            )
        )
    return records


def _split_heading(value: str) -> tuple[str, str | None]:
    normalized = normalize_text(value)
    for status in ("신청접수중", "준비중", "마감"):
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
    if not value or "준비중" in value or "미정" in value:
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
