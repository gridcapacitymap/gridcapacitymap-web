from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
from uuid import UUID

from pydantic import BaseModel, validator

from ..connections.schemas import ConnectionRequestUnified
from ..headroom.schemas import GridCapacityConfig
from ..networks.models import BusType
from ..schemas.geo import LineStringGeometry, PointGeometry, PolygonGeometry


class SolverBackend(str, Enum):
    PANDAPOWER = "PANDAPOWER"
    PSSE = "PSSE"


UNATTENDED_SOLVER_BACKENDS = [SolverBackend.PANDAPOWER]


class NetworkMetadataDump(BaseModel):
    subsystems: str
    geodata: str


class NetworkMetadataGridcapacity(BaseModel):
    backend: SolverBackend
    config: str


class NetworkMetadataConnections(BaseModel):
    xlsx: str
    fake_coords_distance: Optional[int] = None


class NetworkMetadataImport(BaseModel):
    dump: NetworkMetadataDump
    gridcapacity: NetworkMetadataGridcapacity
    connectionRequests: NetworkMetadataConnections
    overwrite_if_modified: bool = True


class SerializedNetwork(BaseModel):
    id: Optional[UUID] = None
    title: str
    created_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    geom: Optional[PolygonGeometry] = None
    gridcapacity_cfg: Optional[GridCapacityConfig]
    solver_backend: Optional[SolverBackend] = SolverBackend.PANDAPOWER
    default_scenario_id: Optional[UUID] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "cim_cgmes",
                    "gridcapacity_cfg": {"case_name": "cim_cgmes.json"},
                    "solver_backend": "PANDAPOWER",
                }
            ]
        }
    }


class SerializedBus(BaseModel):
    number: str
    name: str
    bus_type: BusType
    base_kv: float
    voltage_pu: float
    area_name: Optional[str] = None
    area_number: Optional[int] = None
    zone_name: Optional[str] = None
    zone_number: Optional[int] = None
    actual_load_mva: Tuple[float, float]
    actual_gen_mva: Tuple[float, float]

    @validator("number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


class SerializedBranch(BaseModel):
    from_number: str
    to_number: str
    branch_id: str
    in_service: bool

    @validator("from_number", "to_number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


class SerializedTrafo(BaseModel):
    from_number: str
    to_number: str
    trafo_id: str
    in_service: bool

    @validator("from_number", "to_number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


class SerializedTrafo3w(BaseModel):
    wind1_number: Union[str, int]
    wind2_number: Union[str, int]
    wind3_number: Union[str, int]
    trafo_id: str
    in_service: bool


class SerializedLoad(BaseModel):
    number: str
    name: str
    load_id: str
    area_name: Optional[str]
    area_number: Optional[int]
    zone_name: Optional[str]
    zone_number: Optional[int]
    in_service: bool
    mva_act: Tuple[float, float]

    @validator("number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


class SerializedGenerator(BaseModel):
    number: str
    name: str
    machine_id: str
    area_name: Optional[str]
    area_number: Optional[int]
    zone_name: Optional[str]
    zone_number: Optional[int]
    in_service: bool
    pq_gen: Tuple[float, float]

    @validator("number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


class SerializedSubsystems(BaseModel):
    buses: List[SerializedBus]
    branches: List[SerializedBranch]
    trafos: List[SerializedTrafo]
    trafos3w: List[SerializedTrafo3w]
    loads: List[SerializedLoad]
    gens: List[SerializedGenerator]


class SubsystemTypeEnum(str, Enum):
    BUS = "bus"
    BRANCH = "branch"
    TRAFO = "trafo"
    TRAFO_3W = "trafo3w"


class SubsystemGeoProps(BaseModel):
    typ: SubsystemTypeEnum
    number: Optional[str] = None

    branch_id: Optional[Union[int, str]] = None
    trafo_id: Optional[Union[int, str]] = None

    from_number: Optional[str] = None
    to_number: Optional[str] = None

    w1_number: Optional[str] = None
    w2_number: Optional[str] = None
    w3_number: Optional[str] = None

    @validator(
        "number",
        "from_number",
        "to_number",
        "w1_number",
        "w2_number",
        "w3_number",
        pre=True,
    )
    def validate_number(cls, v):
        return v and str(v)


class SubsystemGeoFeature(BaseModel):
    type: str
    geometry: Union[PointGeometry, LineStringGeometry]
    properties: SubsystemGeoProps


class SubsystemGeoJson(BaseModel):
    type: str = "FeatureCollection"
    features: List[SubsystemGeoFeature]


class BusGeoFeature(BaseModel):
    type: str = "Feature"
    geometry: PointGeometry
    properties: SerializedBus

    class Config:
        from_attributes = True


class BranchGeoFeature(BaseModel):
    type: str = "Feature"
    geometry: LineStringGeometry
    properties: SerializedBranch

    class Config:
        from_attributes = True


class TrafoGeoFeature(BaseModel):
    type: str = "Feature"
    geometry: LineStringGeometry
    properties: SerializedTrafo

    class Config:
        from_attributes = True


class LoadGeoFeature(BaseModel):
    type: str = "Feature"
    geometry: PointGeometry
    properties: SerializedLoad

    class Config:
        from_attributes = True


class GeneratorGeoFeature(BaseModel):
    type: str = "Feature"
    geometry: PointGeometry
    properties: SerializedGenerator

    class Config:
        from_attributes = True


class ConnectionRequestGeoFeature(BaseModel):
    type: str = "Feature"
    geometry: PointGeometry
    properties: ConnectionRequestUnified

    class Config:
        from_attributes = True
