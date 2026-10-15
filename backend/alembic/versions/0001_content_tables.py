"""content tables

Revision ID: 0001
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "modules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "weeks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("week_id", sa.Integer(), sa.ForeignKey("weeks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("external_url", sa.String(1000), nullable=True),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("assessments")
    op.drop_table("tasks")
    op.drop_table("weeks")
    op.drop_table("modules")
