"""assessment resources: links per assessment, and assessment steps linked to their assessment

Revision ID: 0012
Revises: 0011
"""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assessment_resources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(203), nullable=False, unique=True),
        sa.Column("assessment_id", sa.Integer(), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("group", sa.String(20), nullable=False),
        sa.Column("tasks", sa.ARRAY(sa.SmallInteger()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint("\"group\" IN ('recording', 'code_data', 'tool', 'submitting')", name="group"),
    )
    op.create_index("ix_assessment_resources_assessment_id", "assessment_resources", ["assessment_id"])
    op.add_column("tasks", sa.Column("assessment_id", sa.Integer(), sa.ForeignKey("assessments.id", ondelete="SET NULL")))
    op.add_column("tasks", sa.Column("assessment_task", sa.SmallInteger()))
    op.add_column("tasks", sa.Column("shows_all_resources", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index("ix_tasks_assessment_id", "tasks", ["assessment_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_assessment_id", "tasks")
    op.drop_column("tasks", "shows_all_resources")
    op.drop_column("tasks", "assessment_task")
    op.drop_column("tasks", "assessment_id")
    op.drop_table("assessment_resources")
