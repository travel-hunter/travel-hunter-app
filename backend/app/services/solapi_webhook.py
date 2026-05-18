import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import Settings, settings
from app.repositories import notification_deliveries as delivery_repository

SUCCESS_STATUS_CODE = "4000"
IN_PROGRESS_STATUS_CODES = {"2000", "3000"}


@dataclass(frozen=True)
class SolapiWebhookSummary:
    received: int
    updated: int
    ignored: int
    failed: int


def expected_solapi_secret_hash(secret: str) -> str:
    return hashlib.sha1(secret.encode("utf-8")).hexdigest()


def verify_solapi_webhook_secret(
    *,
    received_hash: str | None,
    settings_obj: Settings = settings,
) -> bool:
    if not settings_obj.solapi_webhook_secret:
        return True
    if not received_hash:
        return False
    return received_hash == expected_solapi_secret_hash(settings_obj.solapi_webhook_secret)


def process_solapi_webhook_events(
    db: Session,
    *,
    events: list[dict[str, Any]],
) -> SolapiWebhookSummary:
    updated = 0
    ignored = 0
    failed = 0

    for event in events:
        message_id = _as_str(event.get("messageId"))
        status_code = _as_str(event.get("statusCode"))
        if not message_id or not status_code:
            ignored += 1
            continue

        delivery = delivery_repository.get_delivery_by_provider_message_id(
            db,
            provider_message_id=message_id,
        )
        if delivery is None:
            ignored += 1
            continue

        event_at = _event_datetime(event)
        status_message = _as_str(event.get("statusMessage")) or _as_str(
            event.get("reason")
        )
        if status_code == SUCCESS_STATUS_CODE:
            delivery_repository.mark_delivery_sent_by_webhook(
                db,
                delivery_id=delivery.id,
                sent_at=event_at,
            )
            updated += 1
            continue

        if status_code in IN_PROGRESS_STATUS_CODES:
            ignored += 1
            continue

        if _is_failure_status_code(status_code):
            delivery_repository.mark_delivery_failed(
                db,
                delivery_id=delivery.id,
                error_message=status_message
                or f"SOLAPI webhook reported failure status {status_code}.",
                failed_at=event_at,
            )
            updated += 1
            failed += 1
            continue

        ignored += 1

    if updated:
        db.commit()

    return SolapiWebhookSummary(
        received=len(events),
        updated=updated,
        ignored=ignored,
        failed=failed,
    )


def _is_failure_status_code(status_code: str) -> bool:
    if not status_code.isdigit():
        return False
    numeric = int(status_code)
    return numeric >= 3000 and status_code != "3000" and status_code != "4000"


def _event_datetime(event: dict[str, Any]) -> datetime | None:
    for key in ("dateReported", "dateProcessed", "dateUpdated", "dateCreated"):
        value = _as_str(event.get(key))
        if not value:
            continue
        parsed = _parse_datetime(value)
        if parsed is not None:
            return parsed
    return None


def _parse_datetime(value: str) -> datetime | None:
    normalized = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        return parsed.astimezone().replace(tzinfo=None)
    return parsed


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)
