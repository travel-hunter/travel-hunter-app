from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_optional_db
from app.schemas.policy import Policy, SavePolicyResponse
from app.services import policies as policy_service

router = APIRouter(tags=["policies"])


@router.get("/policies", response_model=list[Policy])
def list_policies(db: Session | None = Depends(get_optional_db)) -> list[Policy]:
    return [Policy(**policy) for policy in policy_service.list_policies(db)]


@router.get("/policies/{policy_slug}", response_model=Policy)
def get_policy(
    policy_slug: str, db: Session | None = Depends(get_optional_db)
) -> Policy:
    policy = policy_service.get_policy(policy_slug, db)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return Policy(**policy)


@router.post("/me/saved-policies/{policy_slug}", response_model=SavePolicyResponse)
def save_policy(policy_slug: str) -> SavePolicyResponse:
    return SavePolicyResponse(**policy_service.save_policy(policy_slug))
