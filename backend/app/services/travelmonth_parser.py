from __future__ import annotations

from datetime import date, datetime
from html.parser import HTMLParser

from app.schemas.external_sources import TravelMonthRegionalBenefitSource
from app.services.travelmonth_normalizer import (
    calculate_field_completeness,
    extract_benefit_value,
    infer_travel_styles,
    normalize_region,
    normalize_status,
    normalize_text,
    parse_period,
    stable_hash,
)


class _BenefitHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[dict[str, object]] = []
        self._current: dict[str, object] | None = None
        self._field_stack: list[str] = []
        self._tag_items: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value for key, value in attrs}
        if tag == "section" and "data-benefit-item" in attr_map:
            self._current = {"raw": "", "tags": []}
            self._field_stack.clear()
            self._tag_items = []
            return

        if self._current is None:
            return

        class_names = set((attr_map.get("class") or "").split())
        if tag == "h3":
            self._field_stack.append("title")
        elif tag == "p" and class_names.intersection({"organizer", "period", "status", "contact"}):
            self._field_stack.append(next(iter(class_names.intersection({"organizer", "period", "status", "contact"}))))
        elif tag == "div" and "benefit" in class_names:
            self._field_stack.append("benefit")
        elif tag == "li":
            self._field_stack.append("tag")
        elif tag == "a" and "detail" in class_names:
            self._current["detail_url"] = attr_map.get("href")

    def handle_endtag(self, tag: str) -> None:
        if self._current is not None and tag == "section":
            self._current["tags"] = list(self._tag_items)
            self.records.append(self._current)
            self._current = None
            self._field_stack.clear()
            self._tag_items = []
            return

        if self._field_stack and tag in {"h3", "p", "div", "li"}:
            self._field_stack.pop()

    def handle_data(self, data: str) -> None:
        if self._current is None:
            return

        text = normalize_text(data)
        if not text:
            return

        self._current["raw"] = normalize_text(f"{self._current.get('raw', '')} {text}")
        if not self._field_stack:
            return

        field = self._field_stack[-1]
        if field == "tag":
            self._tag_items.append(text.lstrip("#"))
            return

        self._current[field] = normalize_text(f"{self._current.get(field, '')} {text}")


def parse_regional_benefits(
    html: str,
    *,
    collected_page_url: str,
    fetched_at: datetime,
    today: date,
) -> list[TravelMonthRegionalBenefitSource]:
    parser = _BenefitHtmlParser()
    parser.feed(html)

    records: list[TravelMonthRegionalBenefitSource] = []
    for raw_record in parser.records:
        title = str(raw_record.get("title", ""))
        organizer_text = str(raw_record.get("organizer", ""))
        period_text = str(raw_record.get("period", ""))
        status_text = str(raw_record.get("status", "")) or None
        benefit_text = str(raw_record.get("benefit", ""))
        contact_text = str(raw_record.get("contact", "")) or None
        detail_url = str(raw_record.get("detail_url", "")) or None
        tags = [str(tag) for tag in raw_record.get("tags", [])]
        raw_text = str(raw_record.get("raw", ""))

        try:
            start_date, end_date = parse_period(period_text)
        except ValueError:
            continue

        if not _has_required_fields(
            title=title,
            organizer_text=organizer_text,
            period_text=period_text,
            start_date=start_date,
            end_date=end_date,
            benefit_text=benefit_text,
            collected_page_url=collected_page_url,
        ):
            continue

        status = normalize_status(status_text, start_date, end_date, today)
        region = normalize_region(organizer_text, title=title, benefit_text=benefit_text)
        benefit_value = extract_benefit_value(benefit_text)
        canonical_text = "|".join([title, organizer_text, period_text])
        confidence = _calculate_confidence(
            {
                "title": title,
                "organizer_text": organizer_text,
                "period_text": period_text,
                "status": status,
                "benefit_text": benefit_text,
                "detail_url": detail_url,
            }
        )

        records.append(
            TravelMonthRegionalBenefitSource(
                external_id=stable_hash(canonical_text),
                canonical_key=stable_hash(canonical_text),
                detail_url=detail_url,
                collected_page_url=collected_page_url,
                title=title,
                organizer_text=organizer_text,
                organizers=[part.strip() for part in organizer_text.split(",") if part.strip()],
                region=region.region,
                city=region.city,
                is_nationwide=region.is_nationwide,
                status_text=status_text,
                status=status,
                start_date=start_date,
                end_date=end_date,
                benefit_text=benefit_text,
                benefit_value_text=benefit_value.value_text,
                extracted_amount_krw=benefit_value.amount_krw,
                extracted_discount_percent=benefit_value.discount_percent,
                benefit_value_type=benefit_value.value_type,
                tags=tags,
                contact_text=contact_text,
                inferred_travel_styles=infer_travel_styles(title=title, benefit_text=benefit_text, tags=tags),
                confidence=confidence,
                field_completeness=calculate_field_completeness(
                    {
                        "title": title,
                        "organizer_text": organizer_text,
                        "period_text": period_text,
                        "status": status,
                        "benefit_text": benefit_text,
                        "detail_url": detail_url,
                        "contact_text": contact_text,
                    }
                ),
                raw_list_text=raw_text,
                raw_detail_text=raw_text,
                raw_payload={"periodText": period_text},
                last_fetched_at=fetched_at,
                last_verified_at=fetched_at if confidence >= 85 else None,
                freshness_status=_freshness_status(status),
            )
        )

    return records


def _has_required_fields(
    *,
    title: str,
    organizer_text: str,
    period_text: str,
    start_date: date | None,
    end_date: date | None,
    benefit_text: str,
    collected_page_url: str,
) -> bool:
    return all(
        [
            normalize_text(title),
            normalize_text(organizer_text),
            normalize_text(period_text),
            start_date,
            end_date,
            normalize_text(benefit_text),
            normalize_text(collected_page_url),
        ]
    )


def _calculate_confidence(values: dict[str, object | None]) -> int:
    completeness = calculate_field_completeness(values)
    return 90 if completeness >= 85 else 70


def _freshness_status(status: str) -> str:
    if status == "active":
        return "fresh"
    if status == "ended":
        return "expired"
    return "unknown"
