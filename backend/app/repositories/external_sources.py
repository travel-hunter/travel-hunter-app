from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExternalSourceRecord
from app.schemas.external_sources import TravelMonthRegionalBenefitSource


def _assign_record(
    record: ExternalSourceRecord,
    source: TravelMonthRegionalBenefitSource,
) -> ExternalSourceRecord:
    column_names = set(ExternalSourceRecord.__table__.columns.keys())
    for key, value in source.model_dump().items():
        if key in column_names:
            setattr(record, key, value)
    return record


def get_external_source_record(
    db: Session,
    *,
    source_name: str,
    source_category: str,
    canonical_key: str,
) -> ExternalSourceRecord | None:
    statement = select(ExternalSourceRecord).where(
        ExternalSourceRecord.source_name == source_name,
        ExternalSourceRecord.source_category == source_category,
        ExternalSourceRecord.canonical_key == canonical_key,
    )
    return db.scalar(statement)


def upsert_external_source_records(
    db: Session,
    sources: Iterable[TravelMonthRegionalBenefitSource],
) -> list[ExternalSourceRecord]:
    records: list[ExternalSourceRecord] = []
    for source in sources:
        record = get_external_source_record(
            db,
            source_name=source.source_name,
            source_category=source.source_category,
            canonical_key=source.canonical_key,
        )
        if record is None:
            record = ExternalSourceRecord()
            db.add(record)
        records.append(_assign_record(record, source))
    db.flush()
    return records


def list_external_source_records(
    db: Session,
    *,
    source_name: str,
    status: str | None = None,
    region: str | None = None,
) -> list[ExternalSourceRecord]:
    statement = select(ExternalSourceRecord).where(
        ExternalSourceRecord.source_name == source_name
    )
    if status is not None:
        statement = statement.where(ExternalSourceRecord.status == status)
    if region is not None:
        statement = statement.where(ExternalSourceRecord.region == region)
    statement = statement.order_by(ExternalSourceRecord.id)
    return list(db.scalars(statement).all())


def list_regional_benefit_recommendation_records(
    db: Session,
) -> list[ExternalSourceRecord]:
    statement = (
        select(ExternalSourceRecord)
        .where(ExternalSourceRecord.source_category == "regional_benefit")
        .where(ExternalSourceRecord.status == "active")
        .where(ExternalSourceRecord.freshness_status == "fresh")
        .order_by(ExternalSourceRecord.id)
    )
    return list(db.scalars(statement).all())


def list_external_source_records_by_category(
    db: Session,
    *,
    source_category: str,
) -> list[ExternalSourceRecord]:
    statement = (
        select(ExternalSourceRecord)
        .where(ExternalSourceRecord.source_category == source_category)
        .order_by(ExternalSourceRecord.id)
    )
    return list(db.scalars(statement).all())
