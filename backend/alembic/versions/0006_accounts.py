"""accounts, sessions, completions, settings

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_table(
        "task_completions",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_task_completions_task_id", "task_completions", ["task_id"])
    op.create_table(
        "prerequisite_completions",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "prerequisite_id", sa.Integer(), sa.ForeignKey("prerequisites.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_prerequisite_completions_prerequisite_id", "prerequisite_completions", ["prerequisite_id"]
    )
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("current_week", sa.Integer(), nullable=True),
        sa.Column("study_mode", sa.String(2), nullable=False, server_default="FT"),
        sa.CheckConstraint("study_mode IN ('FT', 'PT')", name="user_settings_study_mode_check"),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_index("ix_prerequisite_completions_prerequisite_id", table_name="prerequisite_completions")
    op.drop_table("prerequisite_completions")
    op.drop_index("ix_task_completions_task_id", table_name="task_completions")
    op.drop_table("task_completions")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_table("users")
