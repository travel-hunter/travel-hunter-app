from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_optional_db
from app.models import User as UserModel
from app.schemas.user import Profile, ProfileOptions, ProfileUpdate, User
from app.services import auth as auth_service
from app.services import mock_store
from app.services import profile as profile_service

router = APIRouter(tags=["profile"])


def _require_db(db: Session | None) -> Session:
    if db is None:
        raise HTTPException(status_code=500, detail="Database session is required")
    return db


def _require_user(user: UserModel | None) -> UserModel:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


@router.get("/me", response_model=User)
def get_me(current_user: UserModel | None = Depends(get_current_user)) -> User:
    if settings.backend_data_source == "db" and current_user is not None:
        return User(**auth_service.user_to_api(current_user))
    return User(**mock_store.get_user())


@router.get("/me/profile", response_model=Profile)
def get_profile(current_user: UserModel | None = Depends(get_current_user)) -> Profile:
    if settings.backend_data_source == "db":
        return Profile(**profile_service.get_profile(_require_user(current_user)))
    return Profile(**mock_store.get_profile())


@router.patch("/me/profile", response_model=Profile)
def update_profile(
    profile: ProfileUpdate,
    db: Session | None = Depends(get_optional_db),
    current_user: UserModel | None = Depends(get_current_user),
) -> Profile:
    if settings.backend_data_source == "db":
        return Profile(
            **profile_service.update_profile(
                _require_db(db),
                _require_user(current_user),
                profile,
            )
        )
    return Profile(**mock_store.update_profile(profile.model_dump()))


@router.get("/profile-options", response_model=ProfileOptions)
def get_profile_options() -> ProfileOptions:
    return ProfileOptions(**mock_store.get_profile_options())
