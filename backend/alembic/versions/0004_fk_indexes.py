"""index foreign keys

Revision ID: 0004
Revises: 0003
"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_weeks_module_id", "weeks", ["module_id"])
    op.create_index("ix_tasks_week_id", "tasks", ["week_id"])
    op.create_index("ix_assessments_module_id", "assessments", ["module_id"])


def downgrade() -> None:
    op.drop_index("ix_assessments_module_id", table_name="assessments")
    op.drop_index("ix_tasks_week_id", table_name="tasks")
    op.drop_index("ix_weeks_module_id", table_name="weeks")
