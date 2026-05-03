from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(
    title="Travel Hunter API",
    version="0.1.0",
    description="Production app foundation generated from Travel Hunter prototype.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def health_payload() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "travel-hunter-backend",
        "environment": settings.app_env,
        "database": "configured" if settings.database_url else "not_configured",
    }


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return health_payload()


@app.get("/api/health", tags=["system"])
def api_health() -> dict[str, str]:
    return health_payload()
