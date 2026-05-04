import os
from dataclasses import dataclass
from typing import Literal


BackendDataSource = Literal["mock", "db"]


def split_csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


def parse_backend_data_source(value: str) -> BackendDataSource:
    normalized = value.strip().lower()
    if normalized == "db":
        return "db"
    return "mock"


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "local")
    database_url: str = os.getenv("DATABASE_URL", "")
    backend_data_source: BackendDataSource = parse_backend_data_source(
        os.getenv("BACKEND_DATA_SOURCE", "mock")
    )
    cors_origins: tuple[str, ...] = split_csv(
        os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173",
        )
    )


settings = Settings()
