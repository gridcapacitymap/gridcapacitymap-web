"""fix bus types for pp networks

Revision ID: 0029580f5730
Revises: 
Create Date: 2023-12-03 20:33:08.245843

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0029580f5730"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE bustype RENAME VALUE 'SWINGBUG' TO 'SWINGBUS'")
    op.execute("ALTER TYPE bustype ADD VALUE 'NODE' AFTER 'LOADING_AREA'")
    op.execute("COMMIT")


def downgrade() -> None:
    pass
