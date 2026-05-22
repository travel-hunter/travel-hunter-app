from typing import Literal

from pydantic import BaseModel


PolicyCategory = Literal["추천", "환급", "숙박", "캐시백"]
PolicySourceType = Literal["internal", "external"]


class Policy(BaseModel):
    id: str
    slug: str
    label: str
    tag: str
    title: str
    org: str
    region: str
    deadline: str
    amount: str
    summary: str
    match: int
    category: PolicyCategory
    requirements: list[str]
    documents: list[str]
    officialUrl: str | None = None
    applyUrl: str | None = None
    sourceType: PolicySourceType = "internal"


class SavePolicyResponse(BaseModel):
    policyId: str
    saved: bool
