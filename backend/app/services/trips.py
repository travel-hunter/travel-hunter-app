from __future__ import annotations

import secrets
import re
from datetime import date, datetime, timedelta, time
from typing import Any

from sqlalchemy.orm import Session

from app.core import security
from app.data import seed
from app.models import Trip, TripDay, TripInvite, TripPlace, User
from app.repositories import policies as policy_repository
from app.repositories import trips as trip_repository
from app.schemas.trip import (
    CreateTripPlaceRequest,
    CreateTripRequest,
    MoveTripPlaceRequest,
    UpdateTripPlaceRequest,
    UpdateTripStatusRequest,
)


LEGACY_TRIP_ALIAS = str(seed.TRIP["id"])
INVITE_BASE_URL = "travelhunter.app/i"
NUMERIC_TRIP_ID_PATTERN = re.compile(r"^[1-9][0-9]*$")
LEGACY_TRIP_ALIASES = {
    LEGACY_TRIP_ALIAS: {
        "owner_email": str(seed.USER["email"]),
        "title": str(seed.TRIP["title"]),
        "start_date": date(2026, 6, 15),
        "end_date": date(2026, 6, 17),
    }
}
TRIP_EDIT_ROLES = {"owner", "editor"}


class TripServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def _parse_time(value: str) -> time:
    return datetime.strptime(value, "%H:%M").time()


def _parse_optional_time(value: str | None) -> time | None:
    if value is None or value.strip() == "":
        return None
    try:
        return _parse_time(value.strip())
    except ValueError as exc:
        raise TripServiceError(422, "Invalid visit time") from exc


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return f"{value.isoformat()}Z"


def _format_dates(start_date: date, end_date: date) -> str:
    return f"{start_date.year}.{start_date.month:02d}.{start_date.day:02d} - {end_date.month:02d}.{end_date.day:02d}"


def _format_saving(value: int) -> str:
    if value <= 0:
        return "0원"
    if value % 10000 == 0:
        return f"{value // 10000}만원"
    return f"{value:,}원"


def _policy_saving(trip: Trip) -> int:
    total = 0
    for link in trip.policies:
        if link.policy is not None and link.policy.benefit_amount:
            total += int(link.policy.benefit_amount)
    return total


def _trip_role_for_user(trip: Trip, user: User | None) -> str:
    if user is None or trip.owner_id == user.id:
        return "owner"
    for membership in trip.members:
        if membership.user_id == user.id:
            return membership.role if membership.role in {"owner", "editor", "viewer"} else "viewer"
    return "viewer"


def _require_trip_editor(trip: Trip, user: User) -> None:
    if _trip_role_for_user(trip, user) not in TRIP_EDIT_ROLES:
        raise TripServiceError(403, "Trip edit permission required")


def trip_to_api(trip: Trip, user: User | None = None) -> dict[str, object]:
    people: list[str] = []
    seen_people: set[str] = set()
    if trip.owner is not None:
        people.append(trip.owner.nickname)
        seen_people.add(trip.owner.nickname)

    members = sorted(
        trip.members,
        key=lambda membership: (membership.role != "owner", membership.id or 0),
    )
    for membership in members:
        if membership.user is None or membership.user.nickname in seen_people:
            continue
        people.append(membership.user.nickname)
        seen_people.add(membership.user.nickname)

    days: dict[int, list[dict[str, str]]] = {}
    for trip_day in sorted(trip.days, key=lambda day: day.day_number):
        places = sorted(
            trip_day.places,
            key=lambda place: (place.order_num is None, place.order_num or 0, place.id or 0),
        )
        days[trip_day.day_number] = [
            {
                "id": str(place.id) if place.id is not None else None,
                "time": place.visit_time.strftime("%H:%M") if place.visit_time else "",
                "label": place.place_name,
                "meta": place.memo or place.address or "",
            }
            for place in places
        ]

    return {
        "id": str(trip.id),
        "title": trip.title,
        "status": trip.status or "confirmed",
        "dates": _format_dates(trip.start_date, trip.end_date),
        "people": people,
        "expectedSaving": _format_saving(_policy_saving(trip)),
        "days": days,
        "currentUserRole": _trip_role_for_user(trip, user),
    }


def _resolve_trip(db: Session, trip_handle: str, user: User) -> Trip | None:
    if NUMERIC_TRIP_ID_PATTERN.fullmatch(trip_handle):
        return trip_repository.get_accessible_trip_by_id(db, int(trip_handle), user.id)
    alias = LEGACY_TRIP_ALIASES.get(trip_handle)
    if alias is not None:
        return trip_repository.get_seed_alias_trip(
            db,
            user_id=user.id,
            owner_email=str(alias["owner_email"]),
            title=str(alias["title"]),
            start_date=alias["start_date"],
            end_date=alias["end_date"],
        )
    return None


def _resolve_required_trip(db: Session, trip_handle: str, user: User) -> Trip:
    trip = _resolve_trip(db, trip_handle, user)
    if trip is None:
        raise TripServiceError(404, "Trip not found")
    return trip


def _refresh_trip_payload(db: Session, trip_id: int, user: User) -> dict[str, object]:
    if hasattr(db, "expire_all"):
        db.expire_all()
    trip = trip_repository.get_accessible_trip_by_id(db, trip_id, user.id)
    if trip is None:
        raise TripServiceError(404, "Trip not found")
    return trip_to_api(trip, user)


def _find_trip_day(trip: Trip, day_number: int) -> TripDay:
    for trip_day in trip.days:
        if trip_day.day_number == day_number:
            return trip_day
    raise TripServiceError(404, "Trip not found")


def _find_trip_place(trip: Trip, place_id: int) -> TripPlace:
    for trip_day in trip.days:
        for place in trip_day.places:
            if place.id == place_id:
                return place
    raise TripServiceError(404, "Trip not found")


def _find_trip_day_for_place(trip: Trip, place: TripPlace) -> TripDay:
    for trip_day in trip.days:
        for candidate in trip_day.places:
            if candidate is place or candidate.id == place.id:
                return trip_day
    raise TripServiceError(404, "Trip not found")


def _ordered_places(trip_day: TripDay) -> list[TripPlace]:
    return sorted(
        trip_day.places,
        key=lambda place: (place.order_num is None, place.order_num or 0, place.id or 0),
    )


def list_trips(db: Session, user: User) -> list[dict[str, object]]:
    return [trip_to_api(trip, user) for trip in trip_repository.list_accessible_trips(db, user.id)]


def get_trip(trip_handle: str, db: Session, user: User) -> dict[str, object] | None:
    trip = _resolve_trip(db, trip_handle, user)
    if trip is None:
        return None
    return trip_to_api(trip, user)


def delete_trip(trip_handle: str, db: Session, user: User) -> dict[str, object] | None:
    if not NUMERIC_TRIP_ID_PATTERN.fullmatch(trip_handle):
        return None

    trip = trip_repository.get_owned_trip_by_id(db, int(trip_handle), user.id)
    if trip is None:
        return None

    trip_id = int(trip.id)
    trip_repository.detach_recommendations_from_trip(db, trip_id=trip_id)
    trip_repository.delete_trip(db, trip)
    db.commit()
    return {"tripId": str(trip_id), "deleted": True}


def create_trip(
    db: Session,
    user: User,
    payload: CreateTripRequest | None = None,
) -> dict[str, object]:
    payload = (payload or CreateTripRequest()).model_dump()
    if payload.get("description") is None and payload.get("style") is not None:
        payload["description"] = payload["style"]
    region = str(payload.get("region") or seed.PROFILE["region"])
    start_date_value = payload.get("startDate")
    end_date_value = payload.get("endDate")
    if isinstance(start_date_value, date) and isinstance(end_date_value, date):
        start_date = start_date_value
        end_date = end_date_value
        duration_days = (end_date - start_date).days + 1
    else:
        duration_days = int(payload.get("durationDays") or 3)
        start_date = date(2026, 6, 15)
        end_date = start_date + timedelta(days=duration_days - 1)
    title = str(payload.get("title") or f"{region} {duration_days}일 여행")

    trip = trip_repository.create_trip(
        db,
        owner_id=user.id,
        title=title,
        start_date=start_date,
        end_date=end_date,
        status="draft",
        region=region,
        description=str(payload.get("description") or seed.PROFILE["style"]),
    )
    trip_repository.add_trip_member(db, trip_id=trip.id, user_id=user.id, role="owner")

    for day_number in range(1, duration_days + 1):
        places = seed.TRIP["days"].get(day_number, [])
        trip_day = trip_repository.add_trip_day(
            db,
            trip_id=trip.id,
            day_number=day_number,
            date_value=start_date + timedelta(days=day_number - 1),
        )
        for order_num, place in enumerate(places, start=1):
            trip_repository.add_trip_place(
                db,
                trip_day_id=trip_day.id,
                place_name=str(place["label"]),
                visit_time=_parse_time(str(place["time"])),
                order_num=order_num,
                memo=str(place["meta"]),
            )

    trip_repository.add_recommendation(
        db,
        user_id=user.id,
        trip_id=trip.id,
        query=f"{title} recommendations",
        result=seed.RECOMMENDATIONS,
    )
    _ensure_invite(db, trip, user)
    if payload.get("policySlug"):
        policy_slug = str(payload["policySlug"])
        policy = policy_repository.get_policy_by_slug(db, policy_slug)
        if policy is None:
            raise TripServiceError(404, "Policy not found")
        trip_repository.add_trip_policy(db, trip_id=trip.id, policy_id=policy.id)
    db.commit()

    created = trip_repository.get_accessible_trip_by_id(db, trip.id, user.id)
    if created is None:
        raise TripServiceError(404, "Trip not found")
    return trip_to_api(created, user)


def add_policy_to_trip(
    db: Session,
    user: User,
    trip_handle: str,
    policy_slug: str,
) -> dict[str, object]:
    trip = _resolve_required_trip(db, trip_handle, user)
    policy = policy_repository.get_policy_by_slug(db, policy_slug)
    if policy is None:
        raise TripServiceError(404, "Policy not found")

    existing = trip_repository.get_trip_policy(db, trip_id=trip.id, policy_id=policy.id)
    if existing is None:
        trip_repository.add_trip_policy(db, trip_id=trip.id, policy_id=policy.id)
        db.commit()

    return {"tripId": str(trip.id), "policyId": policy_slug, "added": True}


def update_trip_status(
    db: Session,
    user: User,
    trip_handle: str,
    payload: UpdateTripStatusRequest,
) -> dict[str, object]:
    trip = _resolve_required_trip(db, trip_handle, user)
    _require_trip_editor(trip, user)
    trip.status = payload.status
    db.commit()
    return _refresh_trip_payload(db, trip.id, user)


def add_place_to_trip_day(
    db: Session,
    user: User,
    trip_handle: str,
    day_number: int,
    payload: CreateTripPlaceRequest,
) -> dict[str, object]:
    trip = _resolve_required_trip(db, trip_handle, user)
    _require_trip_editor(trip, user)
    trip_day = _find_trip_day(trip, day_number)
    label = payload.label.strip()
    if not label:
        raise TripServiceError(422, "Place label is required")

    next_order = max((place.order_num or 0 for place in trip_day.places), default=0) + 1
    trip_repository.add_trip_place(
        db,
        trip_day_id=trip_day.id,
        place_name=label,
        visit_time=_parse_optional_time(payload.time),
        order_num=next_order,
        memo=payload.meta.strip() if payload.meta is not None else None,
    )
    db.commit()
    return _refresh_trip_payload(db, trip.id, user)


def update_trip_place(
    db: Session,
    user: User,
    trip_handle: str,
    place_id: int,
    payload: UpdateTripPlaceRequest,
) -> dict[str, object]:
    trip = _resolve_required_trip(db, trip_handle, user)
    _require_trip_editor(trip, user)
    place = _find_trip_place(trip, place_id)
    values = payload.model_dump(exclude_unset=True)

    if "label" in values:
        label = (values["label"] or "").strip()
        if not label:
            raise TripServiceError(422, "Place label is required")
        place.place_name = label
    if "time" in values:
        place.visit_time = _parse_optional_time(values["time"])
    if "meta" in values:
        place.memo = values["meta"].strip() if values["meta"] is not None else None

    db.commit()
    return _refresh_trip_payload(db, trip.id, user)


def move_trip_place(
    db: Session,
    user: User,
    trip_handle: str,
    place_id: int,
    payload: MoveTripPlaceRequest,
) -> dict[str, object]:
    trip = _resolve_required_trip(db, trip_handle, user)
    _require_trip_editor(trip, user)
    place = _find_trip_place(trip, place_id)
    source_day = _find_trip_day_for_place(trip, place)
    target_day = _find_trip_day(trip, payload.dayNumber)

    source_places_without_place = [
        candidate for candidate in _ordered_places(source_day) if candidate.id != place.id
    ]
    same_day = source_day.id == target_day.id
    target_places = source_places_without_place if same_day else _ordered_places(target_day)
    max_position = len(target_places) + 1
    if payload.position > max_position:
        raise TripServiceError(422, "Invalid place position")

    target_places.insert(payload.position - 1, place)
    if same_day:
        trip_repository.reorder_trip_day_places(source_day, target_places)
    else:
        trip_repository.reorder_trip_day_places(source_day, source_places_without_place)
        trip_repository.reorder_trip_day_places(target_day, target_places)

    db.commit()
    return _refresh_trip_payload(db, trip.id, user)


def delete_trip_place(
    db: Session,
    user: User,
    trip_handle: str,
    place_id: int,
) -> dict[str, object]:
    trip = _resolve_required_trip(db, trip_handle, user)
    _require_trip_editor(trip, user)
    place = _find_trip_place(trip, place_id)
    trip_repository.delete_trip_place(db, place)
    db.commit()
    return _refresh_trip_payload(db, trip.id, user)


def _recommendation_items(value: Any) -> list[dict[str, str]]:
    if isinstance(value, list):
        raw_items = value
    elif isinstance(value, dict):
        maybe_items = value.get("items")
        raw_items = maybe_items if isinstance(maybe_items, list) else [value]
    else:
        raw_items = []

    items: list[dict[str, str]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        items.append(
            {
                "label": str(item.get("label") or ""),
                "title": str(item.get("title") or ""),
                "meta": str(item.get("meta") or ""),
                "reason": str(item.get("reason") or ""),
            }
        )
    return items


def list_recommendations(
    db: Session,
    user: User,
    trip_handle: str,
) -> list[dict[str, str]] | None:
    trip = _resolve_trip(db, trip_handle, user)
    if trip is None:
        return None

    items: list[dict[str, str]] = []
    for recommendation in trip_repository.list_recommendations(db, trip_id=trip.id, user_id=user.id):
        items.extend(_recommendation_items(recommendation.result))
    return items


def _new_invite_token() -> str:
    return secrets.token_urlsafe(12)


def _ensure_invite(db: Session, trip: Trip, user: User, role: str | None = None) -> TripInvite:
    now = security.utc_now_naive()
    invite = trip_repository.get_latest_active_invite(db, trip_id=trip.id, now=now)
    if invite is not None:
        if role is not None:
            invite.role = role
        return invite

    return trip_repository.create_invite(
        db,
        trip_id=trip.id,
        invite_token=_new_invite_token(),
        created_by=user.id,
        expires_at=now + timedelta(days=60),
        role=role or "editor",
    )


def invite_to_api(invite: TripInvite, *, trip_id: int, invited: bool = False) -> dict[str, object]:
    return {
        "id": str(invite.id),
        "tripId": str(trip_id),
        "inviteToken": invite.invite_token,
        "inviteUrl": f"{INVITE_BASE_URL}/{invite.invite_token}",
        "expiresAt": _iso(invite.expires_at) or "",
        "createdAt": _iso(invite.created_at) or "",
        "acceptedAt": _iso(invite.accepted_at),
        "invited": invited or invite.expires_at > security.utc_now_naive(),
        "copied": False,
        "role": invite.role or "editor",
    }


def get_invite_state(
    db: Session,
    user: User,
    trip_handle: str,
) -> dict[str, object] | None:
    trip = _resolve_trip(db, trip_handle, user)
    if trip is None:
        return None
    invite = _ensure_invite(db, trip, user)
    db.commit()
    return invite_to_api(invite, trip_id=trip.id)


def confirm_invite_sent(
    db: Session,
    user: User,
    trip_handle: str,
    role: str = "editor",
) -> dict[str, object] | None:
    trip = _resolve_trip(db, trip_handle, user)
    if trip is None:
        return None
    invite = _ensure_invite(db, trip, user, role)
    db.commit()
    return invite_to_api(invite, trip_id=trip.id, invited=True)


def accept_invite(db: Session, user: User, invite_token: str) -> dict[str, object] | None:
    now = security.utc_now_naive()
    invite = trip_repository.get_active_invite_by_token(
        db,
        invite_token=invite_token,
        now=now,
    )
    if invite is None:
        return None

    if invite.accepted_at is None:
        invite.accepted_at = now

    existing_member = trip_repository.get_trip_member(
        db,
        trip_id=invite.trip_id,
        user_id=user.id,
    )
    if existing_member is None:
        trip_repository.add_trip_member(
            db,
            trip_id=invite.trip_id,
            user_id=user.id,
            role=invite.role or "editor",
        )

    db.commit()
    return invite_to_api(invite, trip_id=invite.trip_id, invited=True)
