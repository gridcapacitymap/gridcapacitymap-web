from datetime import datetime
from typing import List, Optional

from pydantic.fields import Field
from sqlalchemy.exc import InvalidRequestError

from ..connections.models import ConnectionStatusEnum
from ..connections.schemas import ConnectionRequestApiSchema, Employee
from ..headroom.schemas import (
    BusHeadroomSchema,
    GridCapacityConfig,
    ScenarioHeadroomSchema,
)
from ..schemas import CamelModel
from .models import ConnectionScenario


class ConnectionRequestRef(CamelModel):
    refId: str


class ConnectionScenarioUnified(CamelModel):
    id: Optional[str] = None
    code: str
    name: str
    priority: Optional[int] = 0
    createdDateTime: datetime = Field(default_factory=datetime.utcnow)
    state: Optional[ConnectionStatusEnum]
    author: Optional[Employee] = None
    connectionRequestsList: List[ConnectionRequestRef] = []
    netId: Optional[str] = None

    @classmethod
    def from_sa(cls, x: ConnectionScenario):
        m = cls(
            id=str(x.id),
            netId=str(x.net_id),
            code=x.code,
            name=x.name,
            priority=x.priority,
            createdDateTime=x.created_at,
            state=x.state,
            connectionRequestsList=[],
        )

        try:
            m.connectionRequestsList = [
                ConnectionRequestRef(refId=c.project_id) for c in x.connection_requests
            ]
        except InvalidRequestError:
            pass

        try:
            m.author = Employee(fullName=x.author.full_name) if x.author else None
        except InvalidRequestError:
            pass

        return m


class ScenarioBaseApiSchema(ConnectionScenarioUnified):
    connectionRequestsCount: Optional[int] = 0
    connectionRequestsList: Optional[List[ConnectionRequestRef]] = Field(exclude=True)  # type: ignore
    solverStatus: Optional[str] = None
    solverStatusReason: Optional[str] = None

    @classmethod
    def from_sa(cls, x: ConnectionScenario):
        m = super(ScenarioBaseApiSchema, cls).from_sa(x)
        m.solverStatus = x.solver_task_status
        m.solverStatusReason = x.solver_task_status_reason
        return m


class ScenarioDetailsApiSchema(ConnectionScenarioUnified):
    connectionRequestsList: List[ConnectionRequestApiSchema] = []  # type: ignore
    gridcapacityConfig: Optional[GridCapacityConfig] = None
    headroom: Optional[List[BusHeadroomSchema]] = None

    solverStatus: Optional[str] = None
    solverStatusReason: Optional[str] = None
    solverBackend: Optional[str] = Field(exclude=True)

    @classmethod
    def from_sa(cls, inst: ConnectionScenario):
        m = cls(
            id=str(inst.id),
            code=inst.code,
            name=inst.name,
            priority=inst.priority,
            createdDateTime=inst.created_at,
            state=inst.state,
            connectionRequestsList=[],
            solverStatus=inst.solver_task_status,
            solverStatusReason=inst.solver_task_status_reason,
            solverBackend=inst.net.solver_backend,
        )

        try:
            m.author = Employee(fullName=inst.author.full_name) if inst.author else None
        except InvalidRequestError:
            pass

        try:
            m.headroom = ScenarioHeadroomSchema.from_sa(inst.headroom).headroom
        except InvalidRequestError:
            pass

        try:
            m.connectionRequestsList = [
                ConnectionRequestApiSchema.from_sa(c) for c in inst.connection_requests
            ]
        except InvalidRequestError:
            pass

        return m
