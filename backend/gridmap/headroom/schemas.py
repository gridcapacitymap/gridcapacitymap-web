import uuid
from typing import Any, Dict, List, Optional, Tuple, Union

from pydantic import BaseModel, validator

from ..networks.models import BusType
from .models import BusHeadroom


class TrafoLF(BaseModel):
    from_number: str
    to_number: str
    trafo_id: str = "1"

    @validator("from_number", "to_number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


class BranchLF(BaseModel):
    from_number: str
    to_number: str
    branch_id: str = "1"

    @validator("from_number", "to_number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


LimitingSubsystem = Union[BranchLF, TrafoLF]


class BusHeadroomMetadata(BaseModel):
    type: BusType
    number: str
    ex_name: str

    @validator("number", pre=True)
    def validate_number(cls, v):
        return v and str(v)


class LimitingFactor(BaseModel):
    v: str
    ss: Optional[LimitingSubsystem]


class BusHeadroomSchema(BaseModel):
    bus: BusHeadroomMetadata
    actual_load_mva: Tuple[float, float]
    actual_gen_mva: Tuple[float, float]
    load_avail_mva: Tuple[float, float]
    gen_avail_mva: Tuple[float, float]
    load_lf: Optional[LimitingFactor] = None
    gen_lf: Optional[LimitingFactor] = None


class GridCapacityConfig(BaseModel):
    case_name: str = ""
    upper_load_limit_p_mw: Optional[float] = 200
    upper_gen_limit_p_mw: Optional[float] = 200
    load_power_factor: Optional[float] = 0.9
    gen_power_factor: Optional[float] = 0.9
    headroom_tolerance_p_mw: Optional[float] = 100
    solver_opts: Optional[Dict[str, Any]] = None
    max_iterations: Optional[int] = 10
    normal_limits: Optional[Dict[str, Any]] = None
    contingency_limits: Optional[Dict[str, Any]] = None
    contingency_scenario: Optional[Dict[str, Any]] = None
    use_full_newton_raphson: Optional[bool] = False
    connection_scenario: Optional[Dict[str, Any]] = None
    selected_buses_ids: Optional[List[str]] = None

    @validator("selected_buses_ids", pre=True)
    def validate_number(cls, v):
        return [int(x) if x.isnumeric() else x for x in v]


class ScenarioHeadroomSchema(BaseModel):
    headroom: List[BusHeadroomSchema]

    @classmethod
    def from_sa(cls, headrooms: List[BusHeadroom]):
        items: List[BusHeadroomSchema] = []

        for x in headrooms:
            s = BusHeadroomSchema(
                bus=BusHeadroomMetadata(
                    type=x.bus.bus_type, number=x.bus.number, ex_name=x.bus.name
                ),
                actual_gen_mva=x.actual_gen_mva,  # type: ignore
                actual_load_mva=x.actual_load_mva,  # type: ignore
                gen_avail_mva=x.gen_avail_mva,  # type: ignore
                load_avail_mva=x.load_avail_mva,  # type: ignore
            )

            if x.load_lf_v:
                s.load_lf = LimitingFactor(v=x.load_lf_v, ss=None)

                if x.load_lf_branch:
                    s.load_lf.ss = BranchLF(
                        from_number=x.load_lf_branch.from_bus.number,
                        to_number=x.load_lf_branch.to_bus.number,
                        branch_id=x.load_lf_branch.branch_id,
                    )

                if x.load_lf_trafo:
                    s.load_lf.ss = TrafoLF(
                        from_number=x.load_lf_trafo.from_bus.number,
                        to_number=x.load_lf_trafo.to_bus.number,
                        trafo_id=x.load_lf_trafo.trafo_id,
                    )

            if x.gen_lf_v:
                s.gen_lf = LimitingFactor(v=x.gen_lf_v, ss=None)

                if x.gen_lf_branch:
                    s.gen_lf.ss = BranchLF(
                        from_number=x.gen_lf_branch.from_bus.number,
                        to_number=x.gen_lf_branch.to_bus.number,
                        branch_id=x.gen_lf_branch.branch_id,
                    )

                if x.gen_lf_trafo:
                    s.gen_lf.ss = TrafoLF(
                        from_number=x.gen_lf_trafo.from_bus.number,
                        to_number=x.gen_lf_trafo.to_bus.number,
                        trafo_id=x.gen_lf_trafo.trafo_id,
                    )

            items.append(s)

        return cls(headroom=items)


class GridcapacityTaskParams(BaseModel):
    id: uuid.UUID
    gridcapacityConfig: Optional[GridCapacityConfig] = None
