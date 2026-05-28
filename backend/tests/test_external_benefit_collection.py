from __future__ import annotations

from datetime import UTC, date, datetime

from app.services.external_benefit_collection import (
    SourceCollectionResult,
    collect_external_benefits_from_html_sources,
)


class FakeDb:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1


def test_collect_external_benefits_from_html_sources_upserts_successful_sources(
    monkeypatch,
) -> None:
    calls: list[str] = []

    def fake_upsert(db_arg, sources):
        rows = list(sources)
        calls.extend(source.source_category for source in rows)
        return rows

    monkeypatch.setattr(
        "app.services.external_benefit_collection.external_source_repository.upsert_external_source_records",
        fake_upsert,
    )
    monkeypatch.setattr(
        "app.services.external_benefit_collection.policy_normalization.promote_external_benefits_to_policies",
        lambda db_arg: None,
    )

    db = FakeDb()
    result = collect_external_benefits_from_html_sources(
        db,
        html_sources={
            "regional_benefit": "<html></html>",
            "traffic_benefit": "<h4>테마열차 할인</h4><p>운임료 50% 할인</p>",
            "local_half_trip": (
                "<h2>합천 신청접수중</h2>"
                "<p>신청기간 : 2026.05.20-2026.06.30</p>"
                "<p>여행기간 : 2026.06.01~2026.06.30</p>"
            ),
        },
        fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        today=date(2026, 5, 23),
    )

    assert isinstance(result.sources[0], SourceCollectionResult)
    assert "traffic_benefit" in calls
    assert "local_half_trip" in calls
    assert result.outcome == "success"
    assert result.created_or_updated_count == len(calls)
    assert db.commits == 1


def test_collect_external_benefits_from_html_sources_reports_partial_success(
    monkeypatch,
) -> None:
    def fake_upsert(db_arg, sources):
        return list(sources)

    monkeypatch.setattr(
        "app.services.external_benefit_collection.external_source_repository.upsert_external_source_records",
        fake_upsert,
    )
    monkeypatch.setattr(
        "app.services.external_benefit_collection.policy_normalization.promote_external_benefits_to_policies",
        lambda db_arg: None,
    )

    result = collect_external_benefits_from_html_sources(
        FakeDb(),
        html_sources={
            "traffic_benefit": "<h4>테마열차 할인</h4><p>운임료 50% 할인</p>",
            "unknown_category": "<html></html>",
        },
        fetched_at=datetime(2026, 5, 23, tzinfo=UTC),
        today=date(2026, 5, 23),
    )

    assert result.outcome == "partial_success"
    assert result.parsed_count == 1
    assert [source.outcome for source in result.sources] == ["success", "error"]
