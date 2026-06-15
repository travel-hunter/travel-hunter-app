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


class ExternalCollectionSourceRunResult(BaseModel):
    sourceName: str
    sourceCategory: str
    sourceUrl: str
    parsedCount: int
    createdOrUpdatedCount: int
    outcome: str
    error: str | None = None


class ExternalCollectionRunResponse(BaseModel):
    sourceName: str
    sourceCategory: str
    parsedCount: int
    createdOrUpdatedCount: int
    outcome: str
    sources: list[ExternalCollectionSourceRunResult]


class ExternalCollectionRegionQuality(BaseModel):
    region: str
    totalRecords: int
    activeFreshRecords: int
    endingSoonRecords: int
    recordsWithAmount: int
    estimatedValueKrw: int
    styleCounts: dict[str, int]


class ExternalCollectionQualitySourceBreakdown(BaseModel):
    sourceName: str
    sourceCategory: str
    sourceUrl: str
    totalRecords: int
    activeRecords: int
    freshRecords: int
    latestFetchedAt: datetime | None
    latestVerifiedAt: datetime | None


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
    sourceBreakdown: list[ExternalCollectionQualitySourceBreakdown]
    regions: list[ExternalCollectionRegionQuality]
    recommendationPreview: list[RegionRecommendation]
