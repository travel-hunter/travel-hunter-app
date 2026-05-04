from app.core.config import settings


def get_health_payload() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "travel-hunter-backend",
        "environment": settings.app_env,
        "database": "configured" if settings.database_url else "not_configured",
    }
