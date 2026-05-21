from sqlalchemy.orm import Session

from app.models import User
from app.repositories import users as user_repository
from app.schemas.user import ContactUpdate
from app.schemas.user import ContactVerificationConfirm
from app.schemas.user import ContactVerificationRequest


def normalize_phone_number(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = "".join(value.split())
    return normalized or None


def contact_to_api(user: User) -> dict[str, object]:
    return {
        "phoneNumber": user.phone_number,
        "phoneVerified": user.phone_verified_at is not None,
    }


def get_contact(user: User) -> dict[str, object]:
    return contact_to_api(user)


def update_contact(db: Session, user: User, request: ContactUpdate) -> dict[str, object]:
    updated = user_repository.update_user_contact(
        db,
        user,
        phone_number=normalize_phone_number(request.phoneNumber),
    )
    db.commit()
    return contact_to_api(updated)


def request_contact_verification(
    db: Session,
    user: User,
    request: ContactVerificationRequest,
) -> dict[str, object]:
    from app.services import phone_verification

    return phone_verification.request_contact_verification(db, user, request)


def confirm_contact_verification(
    db: Session,
    user: User,
    request: ContactVerificationConfirm,
) -> dict[str, object]:
    from app.services import phone_verification

    return phone_verification.confirm_contact_verification(db, user, request)
