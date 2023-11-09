import datetime
import uuid
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import UUID, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..database.columns import GeometryJSON, timestamp
from ..database.core import Base
from ..schemas.geo import GeoFeature, LineStringGeometry, PointGeometry

if TYPE_CHECKING:
    from ..scenarios.models import ConnectionScenario


class BusType(Enum):
    UNKNOWN = 0
    LOADING = 1
    GENERATOR = 2
    SWINGBUG = 3  # used to connect to external grids
    DISCONNECTED = 4
    LOADING_AREA = 5  # Load Bus (at boundary of an area)


class Network(Base):
    __tablename__ = "networks"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)
    title: Mapped[str]
    created_at: Mapped[timestamp]
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=func.CURRENT_TIMESTAMP(),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
    deleted_at: Mapped[Optional[timestamp]]
    gridcapacity_cfg: Mapped[Optional[dict[str, Any]]]
    solver_backend: Mapped[Optional[str]]

    default_scenario_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("scenarios.id", ondelete="SET NULL"), nullable=True
    )
    default_scenario: Mapped["ConnectionScenario"] = relationship(
        "ConnectionScenario",
        lazy="raise",
        cascade="all",
        foreign_keys=[default_scenario_id],
    )


class Bus(Base):
    __tablename__ = "network_buses"
    __table_args__ = (UniqueConstraint("number", "net_id", name="_bus_number_net_id"),)
    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    number: Mapped[str]
    name: Mapped[str]
    bus_type: Mapped[BusType]
    base_kv: Mapped[float]
    voltage_pu: Mapped[float]
    area_name: Mapped[Optional[str]]
    area_number: Mapped[Optional[int]]
    zone_name: Mapped[Optional[str]]
    zone_number: Mapped[Optional[int]]

    actual_load_mva: Mapped[ARRAY] = mapped_column(
        ARRAY(Float, as_tuple=True, dimensions=None)
    )
    actual_gen_mva: Mapped[ARRAY] = mapped_column(
        ARRAY(Float, as_tuple=True, dimensions=None)
    )

    geom: Mapped[Optional[GeometryJSON]] = mapped_column(
        GeometryJSON("POINT", srid=4326, nullable=True)
    )

    net_id: Mapped[UUID] = mapped_column(ForeignKey(Network.id, ondelete="CASCADE"))
    net: Mapped[Network] = relationship(
        Network, foreign_keys=[net_id], lazy="joined", cascade="all"
    )

    def to_feature(self):
        props = self.to_dict()
        geometry = props.pop("geom")
        if not geometry:
            raise ValueError(f"Bus {self.id} has no geodata")

        return GeoFeature[PointGeometry](
            geometry=PointGeometry.parse_raw(geometry),
            properties=props,
        )


class Branch(Base):
    __tablename__ = "network_branches"
    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    from_bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    from_bus: Mapped[Bus] = relationship(
        Bus, foreign_keys=[from_bus_id], lazy="joined", cascade="all"
    )

    to_bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    to_bus: Mapped[Bus] = relationship(
        Bus, foreign_keys=[to_bus_id], lazy="joined", cascade="all"
    )

    branch_id: Mapped[str]
    in_service: Mapped[bool]

    geom: Mapped[Optional[GeometryJSON]] = mapped_column(
        GeometryJSON("LINESTRING", srid=4326, nullable=True)
    )

    def to_dict(self):
        d = super().to_dict()
        bus_keys = ["id", "number", "name"]

        if self.from_bus:
            d["from_bus"] = {
                k: v for k, v in self.from_bus.to_dict().items() if k in bus_keys
            }

        if self.to_bus:
            d["to_bus"] = {
                k: v for k, v in self.to_bus.to_dict().items() if k in bus_keys
            }

        return d

    def to_feature(self):
        props = self.to_dict()
        geometry = props.pop("geom")
        if not geometry:
            raise ValueError(f"Branch {self.id} has no geodata")

        return GeoFeature[LineStringGeometry](
            geometry=LineStringGeometry.parse_raw(geometry),
            properties=props,
        )


class Trafo(Base):
    __tablename__ = "network_trafos"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    from_bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    from_bus: Mapped[Bus] = relationship(
        Bus, foreign_keys=[from_bus_id], lazy="joined", cascade="all"
    )

    to_bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    to_bus: Mapped[Bus] = relationship(
        Bus, foreign_keys=[to_bus_id], lazy="joined", cascade="all"
    )

    trafo_id: Mapped[str]
    in_service: Mapped[bool]

    geom: Mapped[Optional[GeometryJSON]] = mapped_column(
        GeometryJSON("LINESTRING", srid=4326, nullable=True)
    )

    def to_dict(self):
        d = super().to_dict()
        bus_keys = ["id", "number", "name"]

        if self.from_bus:
            d["from_bus"] = {
                k: v for k, v in self.from_bus.to_dict().items() if k in bus_keys
            }

        if self.to_bus:
            d["to_bus"] = {
                k: v for k, v in self.to_bus.to_dict().items() if k in bus_keys
            }

        return d

    def to_feature(self):
        props = self.to_dict()
        geometry = props.pop("geom")
        if not geometry:
            raise ValueError(f"Trafo {self.id} has no geodata")

        return GeoFeature[LineStringGeometry](
            geometry=LineStringGeometry.parse_raw(geometry),
            properties=props,
        )


class Trafo3w(Base):
    """3-winding trafos"""

    __tablename__ = "network_trafos_3w"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    w1_bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    w1_bus: Mapped[Bus] = relationship(
        Bus, foreign_keys=[w1_bus_id], lazy="joined", cascade="all"
    )

    w2_bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    w2_bus: Mapped[Bus] = relationship(
        Bus, foreign_keys=[w2_bus_id], lazy="joined", cascade="all"
    )

    w3_bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    w3_bus: Mapped[Bus] = relationship(
        Bus, foreign_keys=[w3_bus_id], lazy="joined", cascade="all"
    )

    trafo_id: Mapped[str]
    in_service: Mapped[bool]

    geom: Mapped[Optional[GeometryJSON]] = mapped_column(
        GeometryJSON("LINESTRING", srid=4326, nullable=True)
    )

    def to_dict(self):
        d = super().to_dict()
        bus_keys = ["id", "number", "name"]

        if self.w1_bus:
            d["w3_bus"] = {
                k: v for k, v in self.w1_bus.to_dict().items() if k in bus_keys
            }

        if self.w2_bus:
            d["w3_bus"] = {
                k: v for k, v in self.w2_bus.to_dict().items() if k in bus_keys
            }

        if self.w3_bus:
            d["w3_bus"] = {
                k: v for k, v in self.w3_bus.to_dict().items() if k in bus_keys
            }

        return d

    def to_feature(self):
        props = self.to_dict()
        geometry = props.pop("geom")
        if not geometry:
            raise ValueError(f"3-winding trafo {self.id} has no geodata")

        return GeoFeature[LineStringGeometry](
            geometry=LineStringGeometry.parse_raw(geometry),
            properties=props,
        )


class Load(Base):
    __tablename__ = "network_loads"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    bus: Mapped[Bus] = relationship(Bus, lazy="joined", cascade="all")

    name: Mapped[str]
    load_id: Mapped[str]
    area_name: Mapped[Optional[str]]
    area_number: Mapped[Optional[int]]
    zone_name: Mapped[Optional[str]]
    zone_number: Mapped[Optional[int]]
    in_service: Mapped[bool]
    mva_act: Mapped[ARRAY] = mapped_column(ARRAY(Float, as_tuple=True, dimensions=None))

    def to_dict(self):
        d = super().to_dict()
        bus_keys = ["id", "number", "name"]

        if self.bus:
            d["from_bus"] = {
                k: v for k, v in self.bus.to_dict().items() if k in bus_keys
            }

        return d


class Generator(Base):
    __tablename__ = "network_generators"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    bus: Mapped[Bus] = relationship(Bus, lazy="joined", cascade="all")

    name: Mapped[str]
    machine_id: Mapped[str]
    area_name: Mapped[Optional[str]]
    area_number: Mapped[Optional[int]]
    zone_name: Mapped[Optional[str]]
    zone_number: Mapped[Optional[int]]
    in_service: Mapped[bool]
    pq_gen: Mapped[ARRAY] = mapped_column(ARRAY(Float, as_tuple=True, dimensions=None))

    def to_dict(self):
        d = super().to_dict()
        bus_keys = ["id", "number", "name"]

        if self.bus:
            d["from_bus"] = {
                k: v for k, v in self.bus.to_dict().items() if k in bus_keys
            }

        return d