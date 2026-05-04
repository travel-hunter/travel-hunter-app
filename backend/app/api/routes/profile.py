from fastapi import APIRouter

from app.schemas.user import Profile, ProfileOptions, ProfileUpdate, User
from app.services import mock_store

router = APIRouter(tags=["profile"])


@router.get("/me", response_model=User)
def get_me() -> User:
    return User(**mock_store.get_user())


@router.patch("/me/profile", response_model=Profile)
def update_profile(profile: ProfileUpdate) -> Profile:
    return Profile(**mock_store.update_profile(profile.model_dump()))


@router.get("/profile-options", response_model=ProfileOptions)
def get_profile_options() -> ProfileOptions:
    return ProfileOptions(**mock_store.get_profile_options())
