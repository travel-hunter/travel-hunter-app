from fastapi import APIRouter

from app.schemas.ops import ExternalCollectionOpsHealth
from app.services.external_collection_scheduler import (
    get_external_collection_ops_health,
)

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/external-collection", response_model=ExternalCollectionOpsHealth)
def external_collection_ops_health() -> ExternalCollectionOpsHealth:
    return ExternalCollectionOpsHealth(**get_external_collection_ops_health())
