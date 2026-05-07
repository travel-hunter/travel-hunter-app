import asyncio
from datetime import date, datetime, time

import anyio
import pytest

from app.core.config import Settings
from app.services import notification_scheduler


def test_disabled_scheduler_does_not_create_task() -> None:
    settings = Settings(notification_scheduler_enabled=False)

    assert notification_scheduler.start_notification_scheduler(settings) is None


def test_enabled_scheduler_requires_database_url() -> None:
    settings = Settings(
        database_url="",
        notification_scheduler_enabled=True,
        notification_run_at="09:00",
        notification_poll_seconds=60,
    )

    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        notification_scheduler.validate_notification_scheduler_settings(settings)


def test_invalid_run_at_is_rejected_when_enabled() -> None:
    settings = Settings(
        database_url="postgresql+psycopg://example",
        notification_scheduler_enabled=True,
        notification_run_at="invalid",
        notification_poll_seconds=60,
    )

    with pytest.raises(ValueError, match="NOTIFICATION_RUN_AT"):
        notification_scheduler.validate_notification_scheduler_settings(settings)


def test_run_time_before_target_does_not_calculate() -> None:
    calls: list[date] = []
    scheduler = notification_scheduler.NotificationScheduler(
        run_at=time(9, 0),
        poll_seconds=60,
        now_provider=lambda: datetime(2026, 5, 7, 8, 59, 0),
        calculate_targets=lambda today: calls.append(today) or [],
    )

    assert scheduler.run_once_if_due() is False
    assert calls == []


def test_run_time_after_target_runs_once_per_kst_date() -> None:
    calls: list[date] = []
    now_values = [
        datetime(2026, 5, 7, 9, 0, 0),
        datetime(2026, 5, 7, 12, 0, 0),
        datetime(2026, 5, 8, 9, 1, 0),
    ]

    scheduler = notification_scheduler.NotificationScheduler(
        run_at=time(9, 0),
        poll_seconds=60,
        now_provider=lambda: now_values.pop(0),
        calculate_targets=lambda today: calls.append(today) or [],
    )

    assert scheduler.run_once_if_due() is True
    assert scheduler.run_once_if_due() is False
    assert scheduler.run_once_if_due() is True
    assert calls == [date(2026, 5, 7), date(2026, 5, 8)]


def test_failed_calculation_does_not_mark_date_as_successful() -> None:
    calls: list[date] = []

    def calculate(today: date) -> list[object]:
        calls.append(today)
        if len(calls) == 1:
            raise RuntimeError("provider is not ready")
        return []

    scheduler = notification_scheduler.NotificationScheduler(
        run_at=time(9, 0),
        poll_seconds=60,
        now_provider=lambda: datetime(2026, 5, 7, 9, 0, 0),
        calculate_targets=calculate,
    )

    assert scheduler.run_once_if_due() is False
    assert scheduler.run_once_if_due() is True
    assert calls == [date(2026, 5, 7), date(2026, 5, 7)]


def test_run_forever_exits_cleanly_on_cancel() -> None:
    async def run() -> bool:
        async def cancel_on_sleep(_seconds: float) -> None:
            raise asyncio.CancelledError

        scheduler = notification_scheduler.NotificationScheduler(
            run_at=time(9, 0),
            poll_seconds=60,
            now_provider=lambda: datetime(2026, 5, 7, 9, 0, 0),
            calculate_targets=lambda _today: [],
            sleep=cancel_on_sleep,
        )

        try:
            await scheduler.run_forever()
        except asyncio.CancelledError:
            return True
        return False

    assert anyio.run(run) is True


def test_target_calculation_once_opens_and_closes_session(monkeypatch) -> None:
    class FakeSession:
        def __init__(self) -> None:
            self.closed = False

        def close(self) -> None:
            self.closed = True

    session = FakeSession()
    calls: list[tuple[object, date]] = []

    def calculate(db, *, today):
        calls.append((db, today))
        return ["target"]

    monkeypatch.setattr(
        notification_scheduler,
        "calculate_deadline_notification_targets",
        calculate,
    )

    result = notification_scheduler.run_notification_target_calculation_once(
        today=date(2026, 5, 7),
        session_factory=lambda: session,
    )

    assert result == ["target"]
    assert calls == [(session, date(2026, 5, 7))]
    assert session.closed is True


def test_dispatch_once_opens_session_and_calls_dispatch(monkeypatch) -> None:
    class FakeSession:
        def __init__(self) -> None:
            self.closed = False

        def close(self) -> None:
            self.closed = True

    session = FakeSession()
    calls: list[tuple[object, date]] = []

    def dispatch(db, *, today):
        calls.append((db, today))
        return notification_scheduler.NotificationDispatchSummary(
            candidates=1,
            sent=0,
            failed=0,
            skipped=0,
            providerEnabled=False,
        )

    monkeypatch.setattr(
        notification_scheduler,
        "dispatch_deadline_notifications",
        dispatch,
    )

    result = notification_scheduler.run_notification_dispatch_once(
        today=date(2026, 5, 7),
        session_factory=lambda: session,
    )

    assert result.candidates == 1
    assert calls == [(session, date(2026, 5, 7))]
    assert session.closed is True
