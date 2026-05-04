from pydantic import BaseModel


class SocialAccount(BaseModel):
    provider: str
    providerNickname: str | None = None
    connectedAt: str


class User(BaseModel):
    id: str
    name: str
    nickname: str
    email: str
    birthDate: str | None = None
    gender: str | None = None
    region: str | None = None
    homeRegion: str
    residenceArea: str | None = None
    preferredRegions: str | None = None
    persona: str
    savedAmount: int
    onboardingCompleted: bool
    socialAccounts: list[SocialAccount]
    createdAt: str
    updatedAt: str


class Profile(BaseModel):
    region: str
    style: str
    budget: str


class ProfileUpdate(BaseModel):
    region: str | None = None
    style: str | None = None
    budget: str | None = None


class ProfileOptions(BaseModel):
    regions: list[str]
    travelStyles: list[str]
    budgets: list[str]


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class AuthResponse(BaseModel):
    accessToken: str
    user: User
