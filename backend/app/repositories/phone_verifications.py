from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PhoneVerificationCode


def create_phone_verification_code(
    db: Session,
    *,
    user_id: int,
    phone_number: str,
    code_hash: str,
    expires_at: datetime,
) -> PhoneVerificationCode:
    code = PhoneVerificationCode(
        user_id=user_id,
        phone_number=phone_number,
        code_hash=code_hash,
        expires_at=expires_at,
        attempt_count=0,
    )
    db.add(code)
    db.flush()
    return code


def get_latest_pending_phone_verification_code(
    db: Session,
    *,
    user_id: int,
    phone_number: str,
) -> PhoneVerificationCode | None:
    statement = (
        select(PhoneVerificationCode)
        .where(
            PhoneVerificationCode.user_id == user_id,
            PhoneVerificationCode.phone_number == phone_number,
            PhoneVerificationCode.verified_at.is_(None),
        )
        .order_by(PhoneVerificationCode.created_at.desc(), PhoneVerificationCode.id.desc())
        .limit(1)
    )
    return db.scalar(statement)
