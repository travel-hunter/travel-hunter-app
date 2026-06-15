"""add pending signup verification table

Revision ID: 0010_pending_signups
Revises: 0009_add_trip_status
Create Date: 2026-06-15 11:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0010_pending_signups"
down_revision: Union[str, None] = "0009_add_trip_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pending_signups",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_pending_signups_email"), "pending_signups", ["email"], unique=False)
    op.create_index(op.f("ix_pending_signups_token_hash"), "pending_signups", ["token_hash"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pending_signups_token_hash"), table_name="pending_signups")
    op.drop_index(op.f("ix_pending_signups_email"), table_name="pending_signups")
    op.drop_table("pending_signups")
