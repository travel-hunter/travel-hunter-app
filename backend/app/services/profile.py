from sqlalchemy.orm import Session

from app.data import seed
from app.models import User
from app.repositories import users as user_repository
from app.schemas.user import ProfileUpdate


def profile_to_api(user: User) -> dict[str, str]:
    return {
        "region": user.region or str(seed.PROFILE["region"]),
        "style": user.travel_style or str(seed.PROFILE["style"]),
        "budget": user.travel_budget or str(seed.PROFILE["budget"]),
    }


def get_profile(user: User) -> dict[str, str]:
    return profile_to_api(user)


def update_profile(db: Session, user: User, request: ProfileUpdate) -> dict[str, str]:
    updated = user_repository.update_user_profile(
        db,
        user,
        region=request.region,
        style=request.style,
        budget=request.budget,
    )
    db.commit()
    return profile_to_api(updated)
