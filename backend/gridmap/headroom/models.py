import datetime
import uuid
from typing import Optional

from sqlalchemy import ARRAY, UUID, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..database.columns import timestamp
from ..database.core import Base
from ..networks.models import Branch, Bus, Trafo, Trafo3w
from ..scenarios.models import ConnectionScenario


class ScenarioViolation(Base):
    __tablename__ = "scenario_violations"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    created_at: Mapped[timestamp]
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=func.CURRENT_TIMESTAMP(),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    scenario_id: Mapped[UUID] = mapped_column(
        ForeignKey(ConnectionScenario.id, ondelete="CASCADE")
    )
    scenario: Mapped[ConnectionScenario] = relationship(
        ConnectionScenario, back_populates="violations", lazy="raise", cascade="all"
    )

    branch_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Branch.id, ondelete="SET NULL"), nullable=True
    )

    trafo_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Trafo.id, ondelete="SET NULL"), nullable=True
    )
    trafo3w_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Trafo3w.id, ondelete="SET NULL"), nullable=True
    )
    bus_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Bus.id, ondelete="SET NULL"), nullable=True
    )

    violation: Mapped[str]
    violated_values: Mapped[ARRAY] = mapped_column(
        ARRAY(Float, as_tuple=True, dimensions=None)
    )
    limit: Mapped[float]


class BusHeadroom(Base):
    __tablename__ = "scenario_bus_headrooms"

    id: Mapped[UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)

    created_at: Mapped[timestamp]
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=func.CURRENT_TIMESTAMP(),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    scenario_id: Mapped[UUID] = mapped_column(
        ForeignKey(ConnectionScenario.id, ondelete="CASCADE")
    )
    scenario: Mapped[ConnectionScenario] = relationship(
        ConnectionScenario, back_populates="headroom", lazy="raise", cascade="all"
    )

    bus_id: Mapped[UUID] = mapped_column(ForeignKey(Bus.id, ondelete="CASCADE"))
    bus: Mapped[Bus] = relationship(Bus, lazy="joined", cascade="all")

    actual_load_mva: Mapped[ARRAY] = mapped_column(
        ARRAY(Float, as_tuple=True, dimensions=None)
    )
    actual_gen_mva: Mapped[ARRAY] = mapped_column(
        ARRAY(Float, as_tuple=True, dimensions=None)
    )
    load_avail_mva: Mapped[ARRAY] = mapped_column(
        ARRAY(Float, as_tuple=True, dimensions=None)
    )
    gen_avail_mva: Mapped[ARRAY] = mapped_column(
        ARRAY(Float, as_tuple=True, dimensions=None)
    )

    load_lf_v: Mapped[Optional[str]]
    load_lf_branch_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Branch.id, ondelete="SET NULL"), nullable=True
    )
    load_lf_branch: Mapped[Optional[Branch]] = relationship(
        Branch,
        lazy="raise",
        cascade="all",
        foreign_keys=[load_lf_branch_id],
    )
    load_lf_trafo_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Trafo.id, ondelete="SET NULL"), nullable=True
    )
    load_lf_trafo: Mapped[Optional[Trafo]] = relationship(
        Trafo,
        lazy="raise",
        cascade="all",
        foreign_keys=[load_lf_trafo_id],
    )

    gen_lf_v: Mapped[Optional[str]]
    gen_lf_branch_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Branch.id, ondelete="SET NULL"), nullable=True
    )
    gen_lf_branch: Mapped[Optional[Branch]] = relationship(
        Branch,
        lazy="raise",
        cascade="all",
        foreign_keys=[gen_lf_branch_id],
    )
    gen_lf_trafo_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey(Trafo.id, ondelete="SET NULL"), nullable=True
    )
    gen_lf_trafo: Mapped[Optional[Trafo]] = relationship(
        Trafo,
        lazy="raise",
        cascade="all",
        foreign_keys=[gen_lf_trafo_id],
    )
