from datetime import date

from pydantic import BaseModel


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
