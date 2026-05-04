from pydantic import BaseModel


class ItineraryPlace(BaseModel):
    time: str
    label: str
    meta: str


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
