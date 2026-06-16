from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.recommendations import RegionRecommendation


class ExternalCollectionOpsHealth(BaseModel):
    schedulerEnabled: bool
    runAt: str
    pollSeconds: int
    minParsedCount: int
    lastAttemptedRunDate: date | None
    lastSuccessfulRunDate: date | None
    lastParsedCount: int | None
    lastOutcome: str | None
    lastError: str | None


class ExternalCollectionRegionQuality(BaseModel):
    region: str
    totalRecords: int
    activeFreshRecords: int
    endingSoonRecords: int
    recordsWithAmount: int
    estimatedValueKrw: int
    styleCounts: dict[str, int]


class ExternalCollectionQualityReport(BaseModel):
    sourceName: str
    sourceCategory: str
    totalRecords: int
    freshRecords: int
    activeRecords: int
    regionalRecords: int
    nationwideRecords: int
    recordsWithAmount: int
    recordsWithStyles: int
    latestFetchedAt: datetime | None
    latestVerifiedAt: datetime | None
    regions: list[ExternalCollectionRegionQuality]
    recommendationPreview: list[RegionRecommendation]
