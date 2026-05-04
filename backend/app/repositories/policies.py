from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Policy


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
