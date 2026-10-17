"""schedule posts: each module's UPLearn forum post per teaching week and study mode

Revision ID: 0009
Revises: 0008
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "schedule_posts",
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("study_mode", sa.String(2), primary_key=True),
        sa.Column("week_number", sa.Integer(), primary_key=True),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.CheckConstraint("study_mode IN ('FT', 'PT')", name="study_mode"),
    )


def downgrade() -> None:
    op.drop_table("schedule_posts")
