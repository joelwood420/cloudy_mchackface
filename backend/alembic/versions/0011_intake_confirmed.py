"""record when a student confirmed their intake

Accounts made before intake choice were put on the July 2026 FT intake without being asked, so they stay NULL
(unconfirmed) and get asked on their next visit.

Revision ID: 0011
Revises: 0010
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("intake_confirmed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "intake_confirmed_at")
