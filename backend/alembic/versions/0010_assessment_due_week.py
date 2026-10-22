"""assessments are due by content week and weekday; the date is worked out per intake

Existing rows get due_week NULL until the seed loader runs again (prod re-seeds right after migrating).
Downgrade brings due_date back as an empty nullable column: the dates are lost and come back on re-seed
with the older code.

Revision ID: 0010
Revises: 0009
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("assessments", sa.Column("due_week", sa.Integer(), nullable=True))
    op.add_column("assessments", sa.Column("due_weekday", sa.SmallInteger(), nullable=False, server_default="6"))
    op.create_check_constraint("due_weekday", "assessments", "due_weekday BETWEEN 0 AND 6")
    op.drop_column("assessments", "due_date")


def downgrade() -> None:
    op.add_column("assessments", sa.Column("due_date", sa.Date(), nullable=True))
    op.drop_constraint("due_weekday", "assessments", type_="check")
    op.drop_column("assessments", "due_weekday")
    op.drop_column("assessments", "due_week")
