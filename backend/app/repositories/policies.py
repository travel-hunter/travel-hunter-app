from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Policy, UserSavedPolicy


def list_policies(db: Session) -> list[Policy]:
    statement = select(Policy).options(selectinload(Policy.documents)).order_by(Policy.id)
    return list(db.scalars(statement).all())


def get_policy_by_slug(db: Session, policy_slug: str) -> Policy | None:
    statement = (
        select(Policy)
        .options(selectinload(Policy.documents))
        .where(Policy.slug == policy_slug)
    )
    return db.scalar(statement)


def get_saved_policy(
    db: Session,
    *,
    user_id: int,
    policy_id: int,
) -> UserSavedPolicy | None:
    statement = select(UserSavedPolicy).where(
        UserSavedPolicy.user_id == user_id,
        UserSavedPolicy.policy_id == policy_id,
    )
    return db.scalar(statement)


def add_saved_policy(
    db: Session,
    *,
    user_id: int,
    policy_id: int,
) -> UserSavedPolicy:
    saved_policy = UserSavedPolicy(user_id=user_id, policy_id=policy_id)
    db.add(saved_policy)
    db.flush()
    return saved_policy


def list_saved_policies(db: Session, *, user_id: int) -> list[Policy]:
    statement = (
        select(UserSavedPolicy)
        .options(selectinload(UserSavedPolicy.policy).selectinload(Policy.documents))
        .where(UserSavedPolicy.user_id == user_id)
        .order_by(UserSavedPolicy.saved_at.desc(), UserSavedPolicy.id.desc())
    )
    saved_rows = list(db.scalars(statement).all())
    return [row.policy for row in saved_rows]


def remove_saved_policy(
    db: Session,
    *,
    user_id: int,
    policy_id: int,
) -> bool:
    saved_policy = get_saved_policy(db, user_id=user_id, policy_id=policy_id)
    if saved_policy is None:
        return False
    db.delete(saved_policy)
    db.flush()
    return True
