import os
from dataclasses import dataclass


def split_csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "local")
    database_url: str = os.getenv("DATABASE_URL", "")
    auth_secret_key: str = os.getenv(
        "AUTH_SECRET_KEY", "dev-only-change-me-secret-key-32-bytes"
    )
    access_token_expire_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    refresh_cookie_name: str = os.getenv(
        "REFRESH_COOKIE_NAME", "travel_hunter_refresh"
    )
    refresh_cookie_secure: bool = os.getenv(
        "REFRESH_COOKIE_SECURE", "false"
    ).strip().lower() in {"1", "true", "yes", "on"}
    cors_origins: tuple[str, ...] = split_csv(
        os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173",
        )
    )


settings = Settings()
