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
    notification_scheduler_enabled: bool = os.getenv(
        "NOTIFICATION_SCHEDULER_ENABLED", "false"
    ).strip().lower() in {"1", "true", "yes", "on"}
    notification_run_at: str = os.getenv("NOTIFICATION_RUN_AT", "09:00")
    notification_poll_seconds: int = int(
        os.getenv("NOTIFICATION_POLL_SECONDS", "60")
    )
    notification_retry_enabled: bool = os.getenv(
        "NOTIFICATION_RETRY_ENABLED", "true"
    ).strip().lower() in {"1", "true", "yes", "on"}
    notification_retry_max_attempts: int = int(
        os.getenv("NOTIFICATION_RETRY_MAX_ATTEMPTS", "3")
    )
    notification_retry_delay_seconds: int = int(
        os.getenv("NOTIFICATION_RETRY_DELAY_SECONDS", "600")
    )
    kakao_alimtalk_enabled: bool = os.getenv(
        "KAKAO_ALIMTALK_ENABLED", "false"
    ).strip().lower() in {"1", "true", "yes", "on"}
    solapi_base_url: str = os.getenv("SOLAPI_BASE_URL", "https://api.solapi.com")
    solapi_api_key: str = os.getenv("SOLAPI_API_KEY", "")
    solapi_api_secret: str = os.getenv("SOLAPI_API_SECRET", "")
    solapi_pf_id: str = os.getenv("SOLAPI_PF_ID", "")
    solapi_template_id_d7: str = os.getenv("SOLAPI_TEMPLATE_ID_D7", "")
    solapi_template_id_d1: str = os.getenv("SOLAPI_TEMPLATE_ID_D1", "")
    solapi_from_number: str = os.getenv("SOLAPI_FROM_NUMBER", "")
    solapi_disable_sms: bool = os.getenv(
        "SOLAPI_DISABLE_SMS", "true"
    ).strip().lower() in {"1", "true", "yes", "on"}
    solapi_timeout_seconds: float = float(os.getenv("SOLAPI_TIMEOUT_SECONDS", "5"))
    solapi_webhook_secret: str = os.getenv("SOLAPI_WEBHOOK_SECRET", "")
    travel_hunter_public_base_url: str = os.getenv(
        "TRAVEL_HUNTER_PUBLIC_BASE_URL", ""
    )
    password_reset_expire_minutes: int = int(
        os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30")
    )
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    kakao_client_id: str = os.getenv("KAKAO_CLIENT_ID", "")
    kakao_client_secret: str = os.getenv("KAKAO_CLIENT_SECRET", "")
    kakao_redirect_uri: str = os.getenv("KAKAO_REDIRECT_URI", "")
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv("GOOGLE_REDIRECT_URI", "")
    oauth_state_cookie_name: str = os.getenv(
        "OAUTH_STATE_COOKIE_NAME", "travel_hunter_oauth_state"
    )


settings = Settings()
