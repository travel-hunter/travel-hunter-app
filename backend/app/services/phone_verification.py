from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core import security
from app.models import User
from app.repositories import phone_verifications as verification_repository
from app.repositories import users as user_repository
from app.schemas.user import ContactVerificationConfirm, ContactVerificationRequest
from app.services.contact import contact_to_api, normalize_phone_number
from app.services.phone_verification_provider import (
    PhoneVerificationProvider,
    PhoneVerificationProviderError,
    build_phone_verification_provider,
)

CODE_TTL_MINUTES = 5
RESEND_COOLDOWN_SECONDS = 60
MAX_ATTEMPTS = 5


class PhoneVerificationError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verification_code(code: str) -> str:
    return security.hash_token(code)


def request_contact_verification(
    db: Session,
    user: User,
    request: ContactVerificationRequest,
    *,
    provider: PhoneVerificationProvider | None = None,
    now: datetime | None = None,
    code_factory=generate_verification_code,
) -> dict[str, object]:
    current_time = now or security.utc_now_naive()
    normalized_phone = normalize_phone_number(request.phoneNumber) if request.phoneNumber is not None else user.phone_number
    if not normalized_phone:
        raise PhoneVerificationError(400, "Phone number is required")

    if user.phone_number != normalized_phone:
        user_repository.update_user_contact(db, user, phone_number=normalized_phone)

    latest_pending_code = verification_repository.get_latest_pending_phone_verification_code(
        db,
        user_id=int(user.id),
        phone_number=normalized_phone,
    )
    if latest_pending_code is not None and latest_pending_code.created_at is not None:
        resend_available_at = latest_pending_code.created_at + timedelta(seconds=RESEND_COOLDOWN_SECONDS)
        if resend_available_at > current_time:
            raise PhoneVerificationError(429, "Verification code resend is not available yet")

    code = code_factory()
    expires_at = current_time + timedelta(minutes=CODE_TTL_MINUTES)
    verification_repository.create_phone_verification_code(
        db,
        user_id=int(user.id),
        phone_number=normalized_phone,
        code_hash=hash_verification_code(code),
        expires_at=expires_at,
    )
    sender = provider or build_phone_verification_provider()
    try:
        sender.send_verification_code(phone_number=normalized_phone, code=code)
    except PhoneVerificationProviderError as error:
        raise PhoneVerificationError(502, str(error)) from error
    db.commit()
    return {
        "requested": True,
        "expiresAt": expires_at.isoformat(),
        "resendAvailableAt": (current_time + timedelta(seconds=RESEND_COOLDOWN_SECONDS)).isoformat(),
    }


def confirm_contact_verification(
    db: Session,
    user: User,
    request: ContactVerificationConfirm,
    *,
    now: datetime | None = None,
) -> dict[str, object]:
    current_time = now or security.utc_now_naive()
    if not user.phone_number:
        raise PhoneVerificationError(400, "Phone number is required")

    code = verification_repository.get_latest_pending_phone_verification_code(
        db,
        user_id=int(user.id),
        phone_number=user.phone_number,
    )
    if code is None:
        raise PhoneVerificationError(400, "Verification code not found")
    if code.expires_at < current_time:
        raise PhoneVerificationError(400, "Verification code expired")
    if code.attempt_count >= MAX_ATTEMPTS:
        raise PhoneVerificationError(400, "Verification code attempts exceeded")

    if code.code_hash != hash_verification_code(request.code):
        code.attempt_count += 1
        db.add(code)
        db.flush()
        db.commit()
        if code.attempt_count >= MAX_ATTEMPTS:
            raise PhoneVerificationError(400, "Verification code attempts exceeded")
        raise PhoneVerificationError(400, "Verification code does not match")

    code.verified_at = current_time
    user.phone_verified_at = current_time
    user.updated_at = current_time
    db.add(code)
    db.add(user)
    db.flush()
    db.commit()
    return contact_to_api(user)
