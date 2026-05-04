from fastapi import APIRouter, HTTPException, status

from app.schemas.policy import Policy, SavePolicyResponse
from app.services import mock_store

router = APIRouter(tags=["policies"])


@router.get("/policies", response_model=list[Policy])
def list_policies() -> list[Policy]:
    return [Policy(**policy) for policy in mock_store.list_policies()]


@router.get("/policies/{policy_slug}", response_model=Policy)
def get_policy(policy_slug: str) -> Policy:
    policy = mock_store.get_policy(policy_slug)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return Policy(**policy)


@router.post("/me/saved-policies/{policy_slug}", response_model=SavePolicyResponse)
def save_policy(policy_slug: str) -> SavePolicyResponse:
    return SavePolicyResponse(**mock_store.save_policy(policy_slug))
