from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


InviteRole = Literal["viewer", "editor"]
TripRole = Literal["owner", "editor", "viewer"]
TripStatus = Literal["draft", "confirmed"]


class ItineraryPlace(BaseModel):
    id: str | None = None
    time: str
    label: str
    meta: str


class CreateTripRequest(BaseModel):
    title: str | None = Field(default=None, max_length=100)
    region: str | None = None
    style: str | None = None
    description: str | None = Field(default=None, max_length=500)
    policySlug: str | None = None
    durationDays: int | None = Field(default=None, ge=2, le=5)
    startDate: date | None = None
    endDate: date | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "CreateTripRequest":
        has_start = self.startDate is not None
        has_end = self.endDate is not None
        if has_start != has_end:
            raise ValueError("startDate and endDate must be provided together")
        if self.startDate is not None and self.endDate is not None:
            day_count = (self.endDate - self.startDate).days + 1
            if day_count < 2 or day_count > 5:
                raise ValueError("Trip date range must be between 2 and 5 days")
        return self


class Trip(BaseModel):
    id: str
    title: str
    status: TripStatus
    dates: str
    people: list[str]
    expectedSaving: str
    days: dict[int, list[ItineraryPlace]]
    currentUserRole: TripRole


class Recommendation(BaseModel):
    label: str
    title: str
    meta: str
    reason: str


class InviteState(BaseModel):
    id: str
    tripId: str
    inviteToken: str
    inviteUrl: str
    expiresAt: str
    createdAt: str
    acceptedAt: str | None = None
    invited: bool
    copied: bool
    role: InviteRole = "editor"


class ConfirmInviteRequest(BaseModel):
    role: InviteRole = "editor"


class TripPolicyResponse(BaseModel):
    tripId: str
    policyId: str
    added: bool


class DeleteTripResponse(BaseModel):
    tripId: str
    deleted: bool


class CreateTripPlaceRequest(BaseModel):
    time: str | None = None
    label: str = Field(min_length=1, max_length=200)
    meta: str | None = None


class UpdateTripPlaceRequest(BaseModel):
    time: str | None = None
    label: str | None = Field(default=None, min_length=1, max_length=200)
    meta: str | None = None


class MoveTripPlaceRequest(BaseModel):
    dayNumber: int = Field(ge=1)
    position: int = Field(ge=1)


class UpdateTripStatusRequest(BaseModel):
    status: TripStatus
