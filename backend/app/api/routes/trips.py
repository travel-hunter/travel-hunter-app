from fastapi import APIRouter, HTTPException, status

from app.schemas.trip import InviteState, Recommendation, Trip, TripPolicyResponse
from app.services import mock_store

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=list[Trip])
def list_trips() -> list[Trip]:
    return [Trip(**trip) for trip in mock_store.list_trips()]


@router.post("", response_model=Trip)
def create_trip() -> Trip:
    return Trip(**mock_store.create_trip())


@router.get("/{trip_id}", response_model=Trip)
def get_trip(trip_id: str) -> Trip:
    trip = mock_store.get_trip(trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return Trip(**trip)


@router.post("/{trip_id}/policies/{policy_slug}", response_model=TripPolicyResponse)
def add_policy_to_trip(trip_id: str, policy_slug: str) -> TripPolicyResponse:
    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if mock_store.get_policy(policy_slug) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return TripPolicyResponse(**mock_store.add_policy_to_trip(trip_id, policy_slug))


@router.get("/{trip_id}/recommendations", response_model=list[Recommendation])
def list_recommendations(trip_id: str) -> list[Recommendation]:
    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return [Recommendation(**item) for item in mock_store.list_recommendations(trip_id)]


@router.get("/{trip_id}/invite", response_model=InviteState)
def get_invite_state(trip_id: str) -> InviteState:
    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return InviteState(**mock_store.get_invite_state(trip_id))


@router.post("/{trip_id}/invite", response_model=InviteState)
def confirm_invite_sent(trip_id: str) -> InviteState:
    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return InviteState(**mock_store.confirm_invite_sent(trip_id))


@router.post("/{trip_id}/invites", response_model=InviteState)
def create_trip_invite(trip_id: str) -> InviteState:
    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return InviteState(**mock_store.get_invite_state(trip_id))
