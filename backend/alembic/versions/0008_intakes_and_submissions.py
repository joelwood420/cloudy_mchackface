"""intakes with week dates and holidays, assessment submissions; users move onto an intake

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

DEFAULT_KEY = "2607-online-ccc-ft"


def upgrade() -> None:
    op.create_table(
        "intakes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("study_mode", sa.String(2), nullable=False),
        sa.CheckConstraint("study_mode IN ('FT', 'PT')", name="study_mode"),
    )
    op.create_table(
        "intake_weeks",
        sa.Column("intake_id", sa.Integer(), sa.ForeignKey("intakes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("week_number", sa.Integer(), primary_key=True),
        sa.Column("starts_on", sa.Date(), nullable=False),
    )
    op.create_table(
        "intake_holidays",
        sa.Column("intake_id", sa.Integer(), sa.ForeignKey("intakes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("day", sa.Date(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
    )
    op.create_table(
        "assessment_submissions",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "assessment_id", sa.Integer(), sa.ForeignKey("assessments.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assessment_submissions_assessment_id", "assessment_submissions", ["assessment_id"])

    # Existing accounts go on the one intake there is. The seed loader fills in its weeks and holidays.
    op.execute(
        f"INSERT INTO intakes (key, title, study_mode) "
        f"VALUES ('{DEFAULT_KEY}', 'July 2026 intake, full-time (NZ4129)', 'FT')"
    )
    op.add_column("user_settings", sa.Column("intake_id", sa.Integer(), nullable=True))
    op.execute(f"UPDATE user_settings SET intake_id = (SELECT id FROM intakes WHERE key = '{DEFAULT_KEY}')")
    op.alter_column("user_settings", "intake_id", nullable=False)
    op.create_foreign_key("user_settings_intake_id_fkey", "user_settings", "intakes", ["intake_id"], ["id"])
    op.create_index("ix_user_settings_intake_id", "user_settings", ["intake_id"])
    op.drop_column("user_settings", "current_week")
    op.drop_column("user_settings", "study_mode")  # its check constraint goes with it


def downgrade() -> None:
    op.add_column("user_settings", sa.Column("study_mode", sa.String(2), nullable=False, server_default="FT"))
    op.create_check_constraint("study_mode", "user_settings", "study_mode IN ('FT', 'PT')")
    op.add_column("user_settings", sa.Column("current_week", sa.Integer(), nullable=True))
    op.drop_index("ix_user_settings_intake_id", table_name="user_settings")
    op.drop_constraint("user_settings_intake_id_fkey", "user_settings", type_="foreignkey")
    op.drop_column("user_settings", "intake_id")
    op.drop_index("ix_assessment_submissions_assessment_id", table_name="assessment_submissions")
    op.drop_table("assessment_submissions")
    op.drop_table("intake_holidays")
    op.drop_table("intake_weeks")
    op.drop_table("intakes")
