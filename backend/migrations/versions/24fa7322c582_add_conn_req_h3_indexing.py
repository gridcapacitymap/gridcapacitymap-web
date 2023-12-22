"""add_conn_req_h3_indexing

Revision ID: 24fa7322c582
Revises: 59ce47b4edd4
Create Date: 2023-12-22 11:04:54.948527

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '24fa7322c582'
down_revision: Union[str, None] = '59ce47b4edd4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('connection_requests', sa.Column('h3_ix', sa.String(length=20), nullable=True))
    op.create_index(op.f('ix_connection_requests_h3_ix'), 'connection_requests', ['h3_ix'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_connection_requests_h3_ix'), table_name='connection_requests')
    op.drop_column('connection_requests', 'h3_ix')
    # ### end Alembic commands ###
