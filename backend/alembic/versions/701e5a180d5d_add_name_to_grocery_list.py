"""add name to grocery list

Revision ID: 701e5a180d5d
Revises: 0001_squashed_schema
Create Date: 2026-01-25 06:59:25.165347+00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "701e5a180d5d"
down_revision: Union[str, Sequence[str], None] = "0001_squashed_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("grocery_lists", sa.Column("name", sa.String(255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("grocery_lists", "name")
