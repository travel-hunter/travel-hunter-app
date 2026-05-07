from pydantic import BaseModel, EmailStr, Field


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


class NotificationSettings(BaseModel):
    deadlineEnabled: bool
    deadlineLeadDays: list[int]


class NotificationSettingsUpdate(BaseModel):
    deadlineEnabled: bool


class ContactInfo(BaseModel):
    phoneNumber: str | None = None
    phoneVerified: bool


class ContactUpdate(BaseModel):
    phoneNumber: str | None = Field(default=None, max_length=30)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)


class AuthResponse(BaseModel):
    accessToken: str
    user: User


class LogoutResponse(BaseModel):
    loggedOut: bool


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=1)
    newPassword: str = Field(min_length=8)


class PasswordResetResponse(BaseModel):
    requested: bool


class PasswordResetConfirmResponse(BaseModel):
    reset: bool
