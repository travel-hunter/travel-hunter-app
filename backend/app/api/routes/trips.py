from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_optional_db
from app.models import User
from app.schemas.trip import CreateTripRequest, InviteState, Recommendation, Trip, TripPolicyResponse
from app.services import mock_store
from app.services import trips as trip_service

router = APIRouter(prefix="/trips", tags=["trips"])


def _require_db(db: Session | None) -> Session:
    if db is None:
        raise HTTPException(status_code=500, detail="Database session is required")
    return db


def _require_user(user: User | None) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def _raise_trip_error(error: trip_service.TripServiceError) -> None:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.get("", response_model=list[Trip])
def list_trips(
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> list[Trip]:
    if settings.backend_data_source == "db":
        return [
            Trip(**trip)
            for trip in trip_service.list_trips(_require_db(db), _require_user(current_user))
        ]
    return [Trip(**trip) for trip in mock_store.list_trips()]


@router.post("", response_model=Trip)
def create_trip(
    payload: CreateTripRequest | None = Body(default=None),
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> Trip:
    if settings.backend_data_source == "db":
        try:
            trip = trip_service.create_trip(
                _require_db(db),
                _require_user(current_user),
                payload,
            )
        except trip_service.TripServiceError as error:
            _raise_trip_error(error)
        return Trip(**trip)
    trip = mock_store.create_trip()
    if payload and payload.policySlug:
        if mock_store.get_policy(payload.policySlug) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        mock_store.add_policy_to_trip(str(trip["id"]), payload.policySlug)
    return Trip(**trip)


@router.get("/{trip_id}", response_model=Trip)
def get_trip(
    trip_id: str,
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> Trip:
    if settings.backend_data_source == "db":
        trip = trip_service.get_trip(trip_id, _require_db(db), _require_user(current_user))
        if trip is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
        return Trip(**trip)

    trip = mock_store.get_trip(trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return Trip(**trip)


@router.post("/{trip_id}/policies/{policy_slug}", response_model=TripPolicyResponse)
def add_policy_to_trip(
    trip_id: str,
    policy_slug: str,
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> TripPolicyResponse:
    if settings.backend_data_source == "db":
        try:
            result = trip_service.add_policy_to_trip(
                _require_db(db),
                _require_user(current_user),
                trip_id,
                policy_slug,
            )
        except trip_service.TripServiceError as error:
            _raise_trip_error(error)
        return TripPolicyResponse(**result)

    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if mock_store.get_policy(policy_slug) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return TripPolicyResponse(**mock_store.add_policy_to_trip(trip_id, policy_slug))


@router.get("/{trip_id}/recommendations", response_model=list[Recommendation])
def list_recommendations(
    trip_id: str,
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> list[Recommendation]:
    if settings.backend_data_source == "db":
        recommendations = trip_service.list_recommendations(
            _require_db(db),
            _require_user(current_user),
            trip_id,
        )
        if recommendations is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
        return [Recommendation(**item) for item in recommendations]

    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return [Recommendation(**item) for item in mock_store.list_recommendations(trip_id)]


@router.get("/{trip_id}/invite", response_model=InviteState)
def get_invite_state(
    trip_id: str,
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> InviteState:
    if settings.backend_data_source == "db":
        invite_state = trip_service.get_invite_state(
            _require_db(db),
            _require_user(current_user),
            trip_id,
        )
        if invite_state is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
        return InviteState(**invite_state)

    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return InviteState(**mock_store.get_invite_state(trip_id))


@router.post("/{trip_id}/invite", response_model=InviteState)
def confirm_invite_sent(
    trip_id: str,
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> InviteState:
    if settings.backend_data_source == "db":
        invite_state = trip_service.confirm_invite_sent(
            _require_db(db),
            _require_user(current_user),
            trip_id,
        )
        if invite_state is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
        return InviteState(**invite_state)

    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return InviteState(**mock_store.confirm_invite_sent(trip_id))


@router.post("/{trip_id}/invites", response_model=InviteState)
def create_trip_invite(
    trip_id: str,
    db: Session | None = Depends(get_optional_db),
    current_user: User | None = Depends(get_current_user),
) -> InviteState:
    if settings.backend_data_source == "db":
        invite_state = trip_service.get_invite_state(
            _require_db(db),
            _require_user(current_user),
            trip_id,
        )
        if invite_state is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
        return InviteState(**invite_state)

    if mock_store.get_trip(trip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return InviteState(**mock_store.get_invite_state(trip_id))
