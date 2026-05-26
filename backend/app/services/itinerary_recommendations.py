from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from app.data.itinerary_catalog import ITINERARY_PLACE_CATALOG


TIME_SLOTS = ("10:00", "14:00", "18:00")


@dataclass(frozen=True)
class CatalogPlace:
    region: str
    style: str
    label: str
    title: str
    meta: str
    reason: str


@dataclass(frozen=True)
class GeneratedPlace:
    day_number: int
    date: date
    time: str
    order_num: int
    region: str
    style: str
    label: str
    title: str
    meta: str
    reason: str


@dataclass(frozen=True)
class GeneratedCourse:
    places: list[GeneratedPlace]
    recommendations: list[dict[str, str]]


def _load_catalog() -> list[CatalogPlace]:
    return [
        CatalogPlace(
            region=str(item["region"]).strip(),
            style=str(item["style"]).strip(),
            label=str(item["label"]),
            title=str(item["title"]),
            meta=str(item["meta"]),
            reason=str(item["reasonSeed"]),
        )
        for item in ITINERARY_PLACE_CATALOG
    ]


CATALOG = _load_catalog()


def _select_candidates(region: str, style: str, requested_count: int) -> list[CatalogPlace]:
    if requested_count <= 0:
        return []

    normalized_region = region.strip()
    normalized_style = style.strip()

    region_matches = [item for item in CATALOG if item.region == normalized_region]
    if not region_matches:
        return []

    preferred = [item for item in region_matches if item.style == normalized_style]
    fallback = [item for item in region_matches if item.style != normalized_style]
    selected: list[CatalogPlace] = []
    seen_titles: set[str] = set()

    for item in [*preferred, *fallback]:
        if item.title in seen_titles:
            continue
        selected.append(item)
        seen_titles.add(item.title)
        if len(selected) >= requested_count:
            break

    return selected


def generate_auto_course(
    *,
    region: str,
    style: str,
    start_date: date,
    day_count: int,
) -> GeneratedCourse:
    requested_count = max(day_count, 0) * len(TIME_SLOTS)
    candidates = _select_candidates(region, style, requested_count)
    places: list[GeneratedPlace] = []
    recommendations: list[dict[str, str]] = []

    for index, candidate in enumerate(candidates):
        day_number = (index // len(TIME_SLOTS)) + 1
        slot_index = index % len(TIME_SLOTS)
        visit_time = TIME_SLOTS[slot_index]
        generated = GeneratedPlace(
            day_number=day_number,
            date=start_date + timedelta(days=day_number - 1),
            time=visit_time,
            order_num=slot_index + 1,
            region=candidate.region,
            style=candidate.style,
            label=candidate.label,
            title=candidate.title,
            meta=candidate.meta,
            reason=candidate.reason,
        )
        places.append(generated)
        recommendations.append(
            {
                "label": generated.label,
                "title": generated.title,
                "meta": f"Day {generated.day_number} · {generated.time} · {generated.meta}",
                "reason": generated.reason,
            }
        )

    return GeneratedCourse(places=places, recommendations=recommendations)
