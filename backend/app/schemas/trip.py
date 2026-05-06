from pydantic import BaseModel, Field


class ItineraryPlace(BaseModel):
    id: str | None = None
    time: str
    label: str
    meta: str


class CreateTripRequest(BaseModel):
    title: str | None = None
    region: str | None = None
    style: str | None = None
    description: str | None = None
    policySlug: str | None = None
    durationDays: int | None = Field(default=None, ge=2, le=5)


class Trip(BaseModel):
    id: str
    title: str
    dates: str
    people: list[str]
    expectedSaving: str
    days: dict[int, list[ItineraryPlace]]


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
