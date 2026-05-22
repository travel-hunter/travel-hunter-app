from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_optional_db
from app.schemas.recommendations import RegionRecommendation
from app.services import region_recommendations as region_recommendation_service

router = APIRouter(tags=["recommendations"])


@router.get("/recommendations/regions", response_model=list[RegionRecommendation])
def list_region_recommendations(
    style: str | None = None,
    region: str | None = None,
    limit: int = Query(default=3, ge=1, le=10),
    db: Session | None = Depends(get_optional_db),
) -> list[RegionRecommendation]:
    if db is None:
        raise HTTPException(status_code=500, detail="DB session is required.")
    return region_recommendation_service.recommend_regions(
        db,
        style=style,
        region=region,
        limit=limit,
    )
