from __future__ import annotations

from dataclasses import dataclass

from app.services.travelmonth_collection import TRAVELMONTH_REGIONAL_BENEFIT_URL
from app.services.travelmonth_stay_parser import (
    SOURCE_URL as TRAVELMONTH_STAY_DISCOUNT_URL,
)
from app.services.travelmonth_traffic_parser import (
    SOURCE_URL as TRAVELMONTH_TRAFFIC_BENEFIT_URL,
)
from app.services.visitisland_parser import NOTICE_URL as VISITISLAND_NOTICE_URL

DGTOURCARD_URL = "https://korean.visitkorea.or.kr/dgtourcard/tour50.do"


@dataclass(frozen=True)
class ExternalSourceIdentity:
    source_key: str
    source_name: str
    source_category: str
    source_url: str


TRAVELMONTH_REGIONAL_BENEFIT = ExternalSourceIdentity(
    source_key="travelmonth-regional-benefit",
    source_name="여행가는 달",
    source_category="regional_benefit",
    source_url=TRAVELMONTH_REGIONAL_BENEFIT_URL,
)

TRAVELMONTH_TRAFFIC_BENEFIT = ExternalSourceIdentity(
    source_key="travelmonth-traffic-benefit",
    source_name="여행가는 달",
    source_category="traffic_benefit",
    source_url=TRAVELMONTH_TRAFFIC_BENEFIT_URL,
)

DGTOURCARD_LOCAL_HALF_TRIP = ExternalSourceIdentity(
    source_key="dgtourcard-local-half-trip",
    source_name="대한민국 반값여행",
    source_category="local_half_trip",
    source_url=DGTOURCARD_URL,
)

TRAVELMONTH_STAY_DISCOUNT = ExternalSourceIdentity(
    source_key="travelmonth-stay-discount",
    source_name="숙박세일 페스타",
    source_category="stay_discount",
    source_url=TRAVELMONTH_STAY_DISCOUNT_URL,
)

VISITISLAND_TRAVEL_SUPPORT = ExternalSourceIdentity(
    source_key="visitisland-island-travel-support",
    source_name="2026 섬 방문의 해",
    source_category="regional_benefit",
    source_url=VISITISLAND_NOTICE_URL,
)

_KNOWN_IDENTITIES = (
    TRAVELMONTH_REGIONAL_BENEFIT,
    TRAVELMONTH_TRAFFIC_BENEFIT,
    DGTOURCARD_LOCAL_HALF_TRIP,
    TRAVELMONTH_STAY_DISCOUNT,
    VISITISLAND_TRAVEL_SUPPORT,
)

_IDENTITY_BY_PARTS = {
    (identity.source_category, identity.source_name, identity.source_url): identity
    for identity in _KNOWN_IDENTITIES
}

_IDENTITY_BY_HTML_SOURCE_CATEGORY = {
    "regional_benefit": TRAVELMONTH_REGIONAL_BENEFIT,
    "traffic_benefit": TRAVELMONTH_TRAFFIC_BENEFIT,
    "local_half_trip": DGTOURCARD_LOCAL_HALF_TRIP,
    "stay_discount": TRAVELMONTH_STAY_DISCOUNT,
    "island_travel_support": VISITISLAND_TRAVEL_SUPPORT,
}


def resolve_external_source_identity(
    *,
    source_category: str | None,
    source_name: str | None,
    source_url: str | None,
) -> ExternalSourceIdentity:
    category = str(source_category or "")
    name = str(source_name or "")
    url = str(source_url or "")
    identity = _IDENTITY_BY_PARTS.get((category, name, url))
    if identity is not None:
        return identity
    label = name or url or category or "unknown"
    return ExternalSourceIdentity(
        source_key=f"{category}:{label}",
        source_name=name,
        source_category=category,
        source_url=url,
    )


def identity_for_html_source_category(source_category: str) -> ExternalSourceIdentity:
    identity = _IDENTITY_BY_HTML_SOURCE_CATEGORY.get(source_category)
    if identity is not None:
        return identity
    return ExternalSourceIdentity(
        source_key=source_category,
        source_name=source_category,
        source_category=source_category,
        source_url="",
    )
