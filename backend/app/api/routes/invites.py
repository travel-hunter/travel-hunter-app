from fastapi import APIRouter, HTTPException, status

from app.schemas.trip import InviteState
from app.services import mock_store

router = APIRouter(prefix="/invites", tags=["invites"])


@router.post("/{invite_token}/accept", response_model=InviteState)
def accept_invite(invite_token: str) -> InviteState:
    invite = mock_store.accept_invite(invite_token)
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return InviteState(**invite)
