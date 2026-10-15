"""module uplearn url

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("modules", sa.Column("uplearn_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("modules", "uplearn_url")
