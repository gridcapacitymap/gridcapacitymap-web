import datetime
import uuid
from enum import Enum
from typing import TYPE_CHECKING, Any, List, Optional

from sqlalchemy import UUID, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..database.columns import GeometryJSON, timestamp
from ..database.core import Base
from ..networks.models import Bus

if TYPE_CHECKING:
    from ..scenarios.models import ConnectionScenario


class ConnectionStatusEnum(str, Enum):
    REQUEST = "1_request"
    RESERVATION = "2_reservation"
    PLANNING = "4_planning"
    CONNECTION = "5_connection"
    NETWORK = "6_network"


class ConnectionKindEnum(str, Enum):
    NEW = "new"
    EXPANSION = "expansion"
    MOVE = "move"
    OTHER = "other"


class ConnectionEnergyKindEnum(str, Enum):
    CONSUMPTION = "consumption"
    PRODUCTION = "production"
    BOTH = "consumptionProduction"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)
    full_name: Mapped[str]


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)
    name: Mapped[str]


class InternalGeo(Base):
    __tablename__ = "internal_geo"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)
    level1_code: Mapped[Optional[str]]


class AdminGeo(Base):
    __tablename__ = "admin_geo"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    code: Mapped[Optional[int]]
    level2_name: Mapped[Optional[str]] = mapped_column(String(50))
    level0_code: Mapped[Optional[str]] = mapped_column(String(50))
    level0_name: Mapped[Optional[str]] = mapped_column(String(50))
    level1_code: Mapped[Optional[int]]
    level2_code: Mapped[Optional[int]]

    connection_requests: Mapped[List["ConnectionRequest"]] = relationship(
        "ConnectionRequest",
        back_populates="admin_geo",
        lazy="raise",
        cascade="all",
    )


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)
    value: Mapped[str]
    reason: Mapped[str]
    datetime: Mapped[timestamp]

    connection_request_id: Mapped[UUID] = mapped_column(
        ForeignKey("connection_requests.id", ondelete="CASCADE")
    )
    connection_request: Mapped["ConnectionRequest"] = relationship(
        "ConnectionRequest", lazy="raise", cascade="all", back_populates="milestone"
    )


class ConnectionRequest(Base):
    __tablename__ = "connection_requests"
    __table_args__ = (
        UniqueConstraint("project_id", "bus_id", name="_connection_request_bus_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    project_id: Mapped[str] = mapped_column()
    status: Mapped[ConnectionStatusEnum]

    created_at: Mapped[timestamp]
    date_desired: Mapped[timestamp]
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=func.CURRENT_TIMESTAMP(),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    power_total: Mapped[float]
    power_increase: Mapped[float]

    connection_kind: Mapped[ConnectionKindEnum]
    connection_energy_kind: Mapped[ConnectionEnergyKindEnum]

    admin_geo_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(AdminGeo.id, ondelete="CASCADE")
    )
    admin_geo: Mapped[Optional[AdminGeo]] = relationship(AdminGeo, lazy="joined")

    bus_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Bus.id, ondelete="CASCADE")
    )
    bus: Mapped[Bus] = relationship(Bus, lazy="joined", cascade="all")

    account_manager_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(User.id, ondelete="CASCADE")
    )
    account_manager: Mapped[User] = relationship(
        User,
        foreign_keys=[account_manager_id],
        lazy="joined",
        cascade="all",
    )

    internal_geo_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(InternalGeo.id, ondelete="CASCADE")
    )
    internal_geo: Mapped[InternalGeo] = relationship(
        InternalGeo, lazy="joined", cascade="all"
    )

    grid_analyst_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(User.id, ondelete="CASCADE")
    )
    grid_analyst: Mapped[User] = relationship(
        User,
        foreign_keys=[grid_analyst_id],
        lazy="joined",
        cascade="all",
    )

    org_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Organization.id, ondelete="CASCADE")
    )
    org: Mapped[Organization] = relationship(Organization, lazy="joined", cascade="all")

    milestone: Mapped[List["Milestone"]] = relationship(
        "Milestone", passive_deletes=True, lazy="joined"
    )

    geom: Mapped[GeometryJSON] = mapped_column(
        GeometryJSON("POINT", srid=4326, nullable=True)
    )

    extra: Mapped[Optional[dict[str, Any]]]

    scenarios: Mapped[List["ConnectionScenario"]] = relationship(
        secondary="scenario_requests_m2m",
        back_populates="connection_requests",
        lazy="raise",
        cascade="all",
    )
