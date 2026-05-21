from pydantic import BaseModel, Field


class RegionRecommendation(BaseModel):
    region: str
    title: str
    reason: str
    policyCount: int = Field(ge=0)
    endingSoonCount: int = Field(ge=0)
    estimatedValueKrw: int = Field(ge=0)
    score: int = Field(ge=0, le=100)
    styleMatchedCount: int = Field(ge=0)
