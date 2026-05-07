from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core import security
from app.models import User


def get_user_by_email(db: Session, email: str) -> User | None:
    statement = (
        select(User)
        .options(selectinload(User.social_accounts))
        .where(User.email == email)
    )
    return db.scalar(statement)


def get_user_by_id(db: Session, user_id: int) -> User | None:
    statement = (
        select(User)
        .options(selectinload(User.social_accounts))
        .where(User.id == user_id)
    )
    return db.scalar(statement)


def create_user(
    db: Session,
    *,
    email: str,
    nickname: str,
    password_hash: str,
) -> User:
    user = User(
        email=email,
        nickname=nickname,
        password_hash=password_hash,
        onboarding_completed=False,
    )
    db.add(user)
    db.flush()
    return user


def update_user_profile(
    db: Session,
    user: User,
    *,
    region: str | None = None,
    style: str | None = None,
    budget: str | None = None,
) -> User:
    if region is not None:
        user.region = region
    if style is not None:
        user.travel_style = style
    if budget is not None:
        user.travel_budget = budget
    user.onboarding_completed = True
    user.updated_at = security.utc_now_naive()
    db.add(user)
    db.flush()
    return user


def update_user_contact(
    db: Session,
    user: User,
    *,
    phone_number: str | None,
) -> User:
    if user.phone_number != phone_number:
        user.phone_verified_at = None
    user.phone_number = phone_number
    user.updated_at = security.utc_now_naive()
    db.add(user)
    db.flush()
    return user
