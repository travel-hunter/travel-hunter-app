from pydantic import BaseModel, EmailStr, Field


class SocialAccount(BaseModel):
    provider: str
    providerNickname: str | None = None
    connectedAt: str


class User(BaseModel):
    id: str
    nickname: str
    email: str
    role: str = "user"
    birthDate: str | None = None
    gender: str | None = None
    region: str | None = None
    homeRegion: str
    residenceArea: str | None = None
    preferredRegions: list[str] | None = None
    persona: str
    savedAmount: int
    onboardingCompleted: bool
    nicknameSetupCompleted: bool
    socialAccounts: list[SocialAccount]
    createdAt: str
    updatedAt: str


class Profile(BaseModel):
    region: str | None = None
    preferredRegions: list[str] | None = None
    style: str | None = None
    budget: str | None = None


class ProfileUpdate(BaseModel):
    region: str | None = None
    preferredRegions: list[str] | None = None
    style: str | None = None
    budget: str | None = None


class ProfileOptions(BaseModel):
    regions: list[str]
    travelStyles: list[str]
    budgets: list[str]


class ProfileSkipResponse(BaseModel):
    skipped: bool
    onboardingCompleted: bool


class NotificationSettings(BaseModel):
    deadlineEnabled: bool
    deadlineLeadDays: list[int]


class NotificationSettingsUpdate(BaseModel):
    deadlineEnabled: bool


class ContactInfo(BaseModel):
    phoneNumber: str | None = None
    phoneVerified: bool


class ContactUpdate(BaseModel):
    phoneNumber: str | None = Field(default=None, max_length=30, pattern=r"^(\s*$|[0-9\-+() ]{7,})$")


class ContactVerificationRequest(BaseModel):
    phoneNumber: str | None = Field(default=None, max_length=30, pattern=r"^(\s*$|[0-9\-+() ]{7,})$")


class ContactVerificationRequestResponse(BaseModel):
    requested: bool
    expiresAt: str
    resendAvailableAt: str


class ContactVerificationConfirm(BaseModel):
    code: str = Field(min_length=4, max_length=8, pattern=r"^[0-9]+$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class SignupRequest(BaseModel):
    email: EmailStr


class SignupVerificationResponse(BaseModel):
    verificationRequired: bool
    email: str


class SignupVerifyRequest(BaseModel):
    token: str = Field(min_length=1)


class SignupVerifyResponse(BaseModel):
    verified: bool
    email: str


class SignupCompleteRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8)


class EmailAvailabilityRequest(BaseModel):
    email: EmailStr


class EmailAvailabilityResponse(BaseModel):
    available: bool


class NicknameSuggestion(BaseModel):
    nickname: str


class NicknameUpdate(BaseModel):
    nickname: str = Field(min_length=2, max_length=20, pattern=r"^[가-힣a-zA-Z0-9_ ]+$")


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
