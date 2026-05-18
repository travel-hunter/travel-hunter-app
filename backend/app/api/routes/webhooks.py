from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_optional_db
from app.schemas.webhook import SolapiWebhookResponse
from app.services import solapi_webhook

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _require_db(db: Session | None) -> Session:
    if db is None:
        raise HTTPException(status_code=500, detail="Database session is required")
    return db


@router.post("/solapi", response_model=SolapiWebhookResponse)
def receive_solapi_webhook(
    events: list[dict[str, Any]],
    x_solapi_secret: str | None = Header(default=None),
    db: Session | None = Depends(get_optional_db),
) -> SolapiWebhookResponse:
    if not solapi_webhook.verify_solapi_webhook_secret(
        received_hash=x_solapi_secret,
        settings_obj=solapi_webhook.settings,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SOLAPI webhook secret",
        )

    summary = solapi_webhook.process_solapi_webhook_events(
        _require_db(db),
        events=events,
    )
    return SolapiWebhookResponse(
        received=summary.received,
        updated=summary.updated,
        ignored=summary.ignored,
        failed=summary.failed,
    )
