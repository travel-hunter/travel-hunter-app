from pydantic import BaseModel


class SolapiWebhookResponse(BaseModel):
    received: int
    updated: int
    ignored: int
    failed: int
