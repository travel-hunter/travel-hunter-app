from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_optional_db
from app.schemas.ops import ExternalCollectionOpsHealth, ExternalCollectionQualityReport
from app.services import external_collection_quality
from app.services.external_collection_scheduler import (
    get_external_collection_ops_health,
)

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/external-collection", response_model=ExternalCollectionOpsHealth)
def external_collection_ops_health() -> ExternalCollectionOpsHealth:
    return ExternalCollectionOpsHealth(**get_external_collection_ops_health())


@router.get(
    "/external-collection/quality",
    response_model=ExternalCollectionQualityReport,
)
def external_collection_quality_report(
    style: str | None = None,
    region: str | None = None,
    limit: int = Query(default=3, ge=1, le=10),
    db: Session | None = Depends(get_optional_db),
) -> ExternalCollectionQualityReport:
    if db is None:
        raise RuntimeError("DB session is required.")
    return external_collection_quality.get_external_collection_quality_report(
        db,
        style=style,
        region=region,
        limit=limit,
    )
