import asyncio
import logging
from collections.abc import Callable
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, settings
from app.db.session import get_session_factory
from app.services.travelmonth_collection import CollectionResult
from app.services.travelmonth_live_collector import (
    collect_regional_benefits_from_live_source,
)
from app.services.notification_scheduler import parse_run_at

KST = ZoneInfo("Asia/Seoul")
logger = logging.getLogger(__name__)


def kst_now() -> datetime:
    return datetime.now(KST)


def run_external_collection_once(
    *,
    today: date | None = None,
    session_factory: sessionmaker[Session] | None = None,
) -> CollectionResult:
    run_date = today or kst_now().date()
    factory = session_factory or get_session_factory()
    db = factory()
    try:
        return collect_regional_benefits_from_live_source(db, today=run_date)
    finally:
        db.close()


class ExternalCollectionScheduler:
    def __init__(
        self,
        *,
        run_at: time,
        poll_seconds: int,
        now_provider: Callable[[], datetime] = kst_now,
        collect: Callable[[date], CollectionResult] | None = None,
        sleep: Callable[[float], object] = asyncio.sleep,
    ) -> None:
        self.run_at = run_at
        self.poll_seconds = poll_seconds
        self.now_provider = now_provider
        self.collect = collect or (lambda today: run_external_collection_once(today=today))
        self.sleep = sleep
        self.last_successful_run_date: date | None = None

    def run_once_if_due(self) -> bool:
        now = self.now_provider()
        today = now.date()
        if self.last_successful_run_date == today:
            return False
        if now.timetz().replace(tzinfo=None) < self.run_at:
            return False

        try:
            result = self.collect(today)
        except Exception:
            logger.exception("External collection failed.")
            return False

        self.last_successful_run_date = today
        logger.info(
            "External collection completed for %s with %s parsed records.",
            today.isoformat(),
            result.parsed_count,
        )
        return True

    async def run_forever(self) -> None:
        try:
            while True:
                await asyncio.to_thread(self.run_once_if_due)
                await self.sleep(self.poll_seconds)
        except asyncio.CancelledError:
            logger.info("External collection scheduler stopped.")
            raise


def validate_external_collection_scheduler_settings(
    settings_obj: Settings = settings,
) -> None:
    if not settings_obj.external_collection_scheduler_enabled:
        return
    if not settings_obj.database_url:
        raise RuntimeError(
            "DATABASE_URL is required when EXTERNAL_COLLECTION_SCHEDULER_ENABLED=true."
        )
    try:
        parse_run_at(settings_obj.external_collection_run_at)
    except ValueError as exc:
        raise ValueError(
            "EXTERNAL_COLLECTION_RUN_AT must use HH:MM or HH:MM:SS format."
        ) from exc
    if settings_obj.external_collection_poll_seconds < 1:
        raise ValueError("EXTERNAL_COLLECTION_POLL_SECONDS must be greater than 0.")


def build_external_collection_scheduler(
    settings_obj: Settings = settings,
) -> ExternalCollectionScheduler:
    return ExternalCollectionScheduler(
        run_at=parse_run_at(settings_obj.external_collection_run_at),
        poll_seconds=settings_obj.external_collection_poll_seconds,
    )


def start_external_collection_scheduler(
    settings_obj: Settings = settings,
) -> asyncio.Task[None] | None:
    if not settings_obj.external_collection_scheduler_enabled:
        return None

    validate_external_collection_scheduler_settings(settings_obj)
    scheduler = build_external_collection_scheduler(settings_obj)
    return asyncio.create_task(
        scheduler.run_forever(),
        name="travel-hunter-external-collection-scheduler",
    )


async def stop_external_collection_scheduler(task: asyncio.Task[None] | None) -> None:
    if task is None:
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
