import datetime
import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import UUID, Column, ForeignKey, Table, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..connections.models import ConnectionStatusEnum, User
from ..database.columns import timestamp
from ..database.core import Base
from ..networks.models import Network

if TYPE_CHECKING:
    from ..connections.models import ConnectionRequest
    from ..headroom.models import BusHeadroom


# note for a Core table, we use the sqlalchemy.Column construct,
# not sqlalchemy.orm.mapped_column
scenario_requests_m2m = Table(
    "scenario_requests_m2m",
    Base.metadata,
    Column(
        "connection_request_id",
        ForeignKey("connection_requests.id", ondelete="CASCADE"),
    ),
    Column("scenario_id", ForeignKey("scenarios.id", ondelete="CASCADE")),
)


class ConnectionScenario(Base):
    __tablename__ = "scenarios"
    __table_args__ = (
        UniqueConstraint("code", "net_id", name="_connection_scenario_net_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    code: Mapped[str] = mapped_column()
    name: Mapped[str]
    priority: Mapped[Optional[int]]
    created_at: Mapped[timestamp]
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=func.CURRENT_TIMESTAMP(),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
    state: Mapped[Optional[ConnectionStatusEnum]]

    author_id: Mapped[UUID] = mapped_column(ForeignKey(User.id))
    author: Mapped[Optional[User]] = relationship(User, lazy="raise", cascade="all")

    connection_requests: Mapped[List["ConnectionRequest"]] = relationship(
        secondary=scenario_requests_m2m,
        back_populates="scenarios",
        lazy="raise",
        cascade="all",
    )

    headroom: Mapped[List["BusHeadroom"]] = relationship(
        "BusHeadroom", passive_deletes=True, lazy="raise", cascade="all"
    )

    solver_task_id: Mapped[Optional[str]]
    solver_task_status: Mapped[Optional[str]]
    solver_task_status_reason: Mapped[Optional[str]]

    net_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            Network.id,
            ondelete="CASCADE",
            use_alter=True,
        )
    )
    net: Mapped[Network] = relationship(
        Network, foreign_keys=[net_id], lazy="raise", cascade="all"
    )
