"""legacy trip revision compatibility marker

Revision ID: 0018_add_trip_revision
Revises: 0010_pending_signups
Create Date: 2026-06-15 13:05:00.000000
"""

from typing import Sequence, Union


revision: str = "0018_add_trip_revision"
down_revision: Union[str, None] = "0010_pending_signups"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Historical dev/staging databases were stamped at this revision before the
    # repo copy lost the intermediate migration file. Current application models
    # no longer require additional DDL here; keep this marker so Alembic can
    # reason about those existing databases and continue to later migrations.
    pass


def downgrade() -> None:
    pass
