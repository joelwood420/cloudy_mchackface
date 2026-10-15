"""submodules and prerequisites

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Content is re-seedable and nothing per-user points at it yet, so clear it rather than backfill
    # weeks.submodule_id. Run `uv run python -m app.seed` straight after upgrading.
    op.execute("DELETE FROM modules")

    op.create_table(
        "submodules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_index("ix_submodules_module_id", "submodules", ["module_id"])

    op.add_column("weeks", sa.Column("submodule_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "weeks_submodule_id_fkey", "weeks", "submodules", ["submodule_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_weeks_submodule_id", "weeks", ["submodule_id"])

    op.create_table(
        "prerequisites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False, unique=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("note", sa.String(300), nullable=True),
        sa.Column("external_url", sa.String(1000), nullable=True),
        sa.Column("uplearn_url", sa.String(1000), nullable=True),
    )
    op.create_table(
        "submodule_prerequisites",
        sa.Column("submodule_id", sa.Integer(), sa.ForeignKey("submodules.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "prerequisite_id", sa.Integer(), sa.ForeignKey("prerequisites.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_index(
        "ix_submodule_prerequisites_prerequisite_id", "submodule_prerequisites", ["prerequisite_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_submodule_prerequisites_prerequisite_id", table_name="submodule_prerequisites")
    op.drop_table("submodule_prerequisites")
    op.drop_table("prerequisites")
    op.drop_index("ix_weeks_submodule_id", table_name="weeks")
    op.drop_constraint("weeks_submodule_id_fkey", "weeks", type_="foreignkey")
    op.drop_column("weeks", "submodule_id")
    op.drop_index("ix_submodules_module_id", table_name="submodules")
    op.drop_table("submodules")
