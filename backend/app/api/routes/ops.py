from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_optional_db
from app.models import User
from app.schemas.ops import ExternalCollectionOpsHealth, ExternalCollectionQualityReport
from app.services import external_collection_quality
from app.services.external_collection_scheduler import (
    get_external_collection_ops_health,
)

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/external-collection", response_model=ExternalCollectionOpsHealth)
def external_collection_ops_health(
    _current_user: User | None = Depends(get_current_user),
) -> ExternalCollectionOpsHealth:
    return ExternalCollectionOpsHealth(**get_external_collection_ops_health())


@router.get(
    "/external-collection/quality",
    response_model=ExternalCollectionQualityReport,
)
def external_collection_quality_report(
    style: str | None = None,
    region: str | None = None,
    limit: int = Query(default=3, ge=1, le=10),
    _current_user: User | None = Depends(get_current_user),
    db: Session | None = Depends(get_optional_db),
) -> ExternalCollectionQualityReport:
    if db is None:
        raise HTTPException(status_code=500, detail="DB session is required.")
    return external_collection_quality.get_external_collection_quality_report(
        db,
        style=style,
        region=region,
        limit=limit,
    )
