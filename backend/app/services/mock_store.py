from copy import deepcopy
from typing import Any, TypeVar

from app.data import seed

T = TypeVar("T")

_profile = deepcopy(seed.PROFILE)
_saved_policy_ids: set[str] = set()
_trip_policy_ids: set[tuple[str, str]] = set()
_invited_trip_ids: set[str] = set()


def _clone(value: T) -> T:
    return deepcopy(value)


def get_user() -> dict[str, Any]:
    return _clone(seed.USER)


def create_auth_response() -> dict[str, Any]:
    return {
        "accessToken": "mock-token",
        "user": get_user(),
    }


def get_profile() -> dict[str, str]:
    return _clone(_profile)


def update_profile(profile: dict[str, str | None]) -> dict[str, str]:
    for key, value in profile.items():
        if value is not None:
            _profile[key] = value
    return get_profile()


def get_profile_options() -> dict[str, list[str]]:
    return _clone(seed.PROFILE_OPTIONS)


def list_policies() -> list[dict[str, Any]]:
    return _clone(seed.POLICIES)


def get_policy(policy_slug: str) -> dict[str, Any] | None:
    for policy in seed.POLICIES:
        if policy["slug"] == policy_slug or policy["id"] == policy_slug:
            return _clone(policy)
    return None


def save_policy(policy_slug: str) -> dict[str, Any]:
    _saved_policy_ids.add(policy_slug)
    return {
        "policyId": policy_slug,
        "saved": True,
    }


def list_trips() -> list[dict[str, Any]]:
    return [_clone(seed.TRIP)]


def create_trip() -> dict[str, Any]:
    return _clone(seed.TRIP)


def get_trip(trip_id: str) -> dict[str, Any] | None:
    if trip_id == seed.TRIP["id"]:
        return _clone(seed.TRIP)
    return None


def add_policy_to_trip(trip_id: str, policy_slug: str) -> dict[str, Any]:
    _trip_policy_ids.add((trip_id, policy_slug))
    return {
        "tripId": trip_id,
        "policyId": policy_slug,
        "added": True,
    }


def list_recommendations(_trip_id: str) -> list[dict[str, Any]]:
    return _clone(seed.RECOMMENDATIONS)


def get_invite_state(trip_id: str) -> dict[str, Any]:
    return {
        "id": "1",
        "tripId": trip_id,
        "inviteToken": seed.INVITE_TOKEN,
        "inviteUrl": seed.INVITE_URL,
        "expiresAt": seed.INVITE_EXPIRES_AT,
        "createdAt": seed.INVITE_CREATED_AT,
        "acceptedAt": "2026-05-04T00:10:00Z" if trip_id in _invited_trip_ids else None,
        "invited": trip_id in _invited_trip_ids,
        "copied": False,
    }


def confirm_invite_sent(trip_id: str) -> dict[str, Any]:
    _invited_trip_ids.add(trip_id)
    return {
        "id": "1",
        "tripId": trip_id,
        "inviteToken": seed.INVITE_TOKEN,
        "inviteUrl": seed.INVITE_URL,
        "expiresAt": seed.INVITE_EXPIRES_AT,
        "createdAt": seed.INVITE_CREATED_AT,
        "acceptedAt": "2026-05-04T00:10:00Z",
        "invited": True,
        "copied": False,
    }


def accept_invite(invite_token: str) -> dict[str, Any] | None:
    if invite_token != seed.INVITE_TOKEN:
        return None
    return confirm_invite_sent(str(seed.TRIP["id"]))
