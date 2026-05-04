from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.models import User as UserModel
from app.schemas.user import Profile, ProfileOptions, ProfileUpdate, User
from app.services import auth as auth_service
from app.services import mock_store

router = APIRouter(tags=["profile"])


@router.get("/me", response_model=User)
def get_me(current_user: UserModel | None = Depends(get_current_user)) -> User:
    if settings.backend_data_source == "db" and current_user is not None:
        return User(**auth_service.user_to_api(current_user))
    return User(**mock_store.get_user())


@router.patch("/me/profile", response_model=Profile)
def update_profile(profile: ProfileUpdate) -> Profile:
    return Profile(**mock_store.update_profile(profile.model_dump()))


@router.get("/profile-options", response_model=ProfileOptions)
def get_profile_options() -> ProfileOptions:
    return ProfileOptions(**mock_store.get_profile_options())
