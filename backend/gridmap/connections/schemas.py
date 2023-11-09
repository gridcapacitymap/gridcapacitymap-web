import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Union

from pydantic.fields import Field

from ..schemas import CamelModel
from .models import (
    ConnectionEnergyKindEnum,
    ConnectionKindEnum,
    ConnectionRequest,
    ConnectionStatusEnum,
)


class AdminGeo(CamelModel):
    code: Optional[int] = 0

    level0_code: Optional[str] = None
    level0_name: Optional[str] = None

    level1_code: Optional[int] = None

    level2_code: Optional[int] = None
    level2_name: Optional[str] = None


class ConnectivityNode(CamelModel):
    id: Union[str, int]


class Employee(CamelModel):
    fullName: Optional[str]


class Organization(CamelModel):
    name: str


class InternalGeo(CamelModel):
    level1_code: Optional[str]


class Milestone(CamelModel):
    value: str
    reason: str
    dateTime: datetime = Field(default_factory=datetime.utcnow)


class ExtraKeys(CamelModel):
    capacityLimitedArea: Optional[str] = None
    nationalTransmissionGridConnectionProcess: Optional[str] = None
    sweref99tmNorthing: Optional[float] = None
    sweref99tmEasting: Optional[float] = None
    wsg84lat: Optional[float] = None
    wsg84lon: Optional[float] = None


class ConnectionRequestUnified(CamelModel):
    id: str
    createdDateTime: datetime = Field(default_factory=datetime.utcnow)
    dateDesired: datetime = Field(default_factory=datetime.utcnow)
    powerTotal: float
    powerIncrease: float
    status: ConnectionStatusEnum
    connectionKind: ConnectionKindEnum
    connectionEnergyKind: ConnectionEnergyKindEnum
    adminGeo: AdminGeo
    connectivityNode: ConnectivityNode
    accountManager: Employee
    internalGeo: InternalGeo
    gridAnalyst: Employee
    organization: Organization
    extra: Optional[ExtraKeys]
    milestone: List[Milestone] = []

    @classmethod
    def from_sa(cls, x: ConnectionRequest):
        d = x.to_dict()
        d["organization"] = x.org.to_dict()
        d["grid_analyst"] = x.grid_analyst.to_dict()
        d["internal_geo"] = x.internal_geo.to_dict()
        d["account_manager"] = x.account_manager.to_dict()
        d["connectivity_node"] = {"id": x.bus.number}
        d["extra"] = x.extra
        d["milestone"] = [m.to_dict() for m in x.milestone]

        if x.admin_geo:
            d["admin_geo"] = x.admin_geo.to_dict()

        return cls.model_validate(d)

    def to_sa(self) -> ConnectionRequest:
        c = ConnectionRequest()
        c.created_at = self.createdDateTime
        c.date_desired = self.dateDesired
        c.power_total = self.powerTotal
        c.power_increase = self.powerIncrease
        c.project_id = self.id
        c.status = self.status
        c.connection_kind = self.connectionKind
        c.connection_energy_kind = self.connectionEnergyKind

        if self.extra:
            c.extra = self.extra.model_dump()
            c.geom = {
                "type": "Point",
                "coordinates": [self.extra.wsg84lon, self.extra.wsg84lat],
            }  # type: ignore

        return c


class ConnectionRequestApiSchema(ConnectionRequestUnified):
    projectId: Optional[str] = None

    @classmethod
    def from_sa(cls, x: ConnectionRequest):
        data = super(ConnectionRequestApiSchema, cls).from_sa(x)
        data.projectId = x.project_id
        return data


@dataclass
class ConnectionFilterParams:
    bus_id: List[uuid.UUID]
    status: Optional[ConnectionStatusEnum]

    connection_kind: Optional[ConnectionKindEnum]
    connection_energy_kind: Optional[ConnectionEnergyKindEnum]

    power_increase_gt: Optional[int]
    power_increase_lt: Optional[int]

    area: List[str]
