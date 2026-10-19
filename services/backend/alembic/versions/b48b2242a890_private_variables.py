"""Private encrypted variables and value-access audit.

Revision ID: b48b2242a890
Revises: 6cb0dede5a07
"""

from alembic import op
import sqlalchemy as sa

revision = "b48b2242a890"
down_revision = "6cb0dede5a07"
branch_labels = None
depends_on = None


def upgrade():
    # The API also creates new tables on startup. Coexist with that path.
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("private_variables"):
        op.create_table(
            "private_variables",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "owner_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False
            ),
            sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id")),
            sa.Column("scope_key", sa.String(36), nullable=False),
            sa.Column("name", sa.String(128), nullable=False),
            sa.Column("secret", sa.Boolean, nullable=False),
            sa.Column("encrypted_value", sa.Text, nullable=False),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.UniqueConstraint("owner_id", "scope_key", "name"),
        )
        op.create_index(
            "ix_private_variables_owner_id", "private_variables", ["owner_id"]
        )
        op.create_index(
            "ix_private_variables_project_id", "private_variables", ["project_id"]
        )
    if not inspector.has_table("variable_access"):
        op.create_table(
            "variable_access",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column(
                "owner_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False
            ),
            sa.Column("variable_id", sa.String(36), nullable=False),
            sa.Column("action", sa.String(20), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_variable_access_owner_id", "variable_access", ["owner_id"])


def downgrade():
    op.drop_table("variable_access")
    op.drop_table("private_variables")
