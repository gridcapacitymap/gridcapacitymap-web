"""migrate pp bus types

Revision ID: 3749eea677db
Revises: 0029580f5730
Create Date: 2023-12-03 22:37:11.077585

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3749eea677db"
down_revision: Union[str, None] = "0029580f5730"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        'UPDATE network_buses SET bus_type = \'NODE\' WHERE net_id IN (SELECT "id" FROM "networks" WHERE "solver_backend" = \'PANDAPOWER\')'
    )


def downgrade() -> None:
    pass
