"""record disclaimer acceptance on users

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nullable: accounts made before this migration have no acceptance on record.
    op.add_column("users", sa.Column("disclaimer_version", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("disclaimer_accepted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "disclaimer_accepted_at")
    op.drop_column("users", "disclaimer_version")
