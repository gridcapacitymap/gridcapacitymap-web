import json
import logging
import os
import time
import uuid
import warnings
from typing import Callable

from sqlalchemy.ext.asyncio import AsyncSession

from ..database.session import async_to_sync_session
from ..headroom.schemas import (
    GridCapacityConfig,
    GridcapacityTaskParams,
    ScenarioHeadroomSchema,
)
from ..headroom.service import ScenarioHeadroomService
from ..tasks_monitor.schemas import CeleryTaskMetadata
from .celeryapp import PROGRESS, celery

warnings.simplefilter(action="ignore", category=FutureWarning)


def save_headroom(scenario_id: uuid.UUID, data: ScenarioHeadroomSchema):
    async def async_main(session: AsyncSession):
        repo = ScenarioHeadroomService(session)
        await repo.update_scenario_headroom(scenario_id, data)

    async_to_sync_session(async_main)


def calc_headroom(cfg: GridCapacityConfig, on_progress: Callable) -> str:
    import gridcapacity

    # silence excessive logging slowing down progress
    logging.getLogger(gridcapacity.__name__).setLevel(logging.WARNING)

    from gridcapacity.backends.subsystems import (
        Branches,
        Buses,
        SwingBuses,
        Trafos,
        Trafos3w,
    )
    from gridcapacity.capacity_analysis import CapacityAnalyser
    from gridcapacity.config import ConfigModel
    from gridcapacity.output import json_dump_kwargs
    from gridcapacity.violations_analysis import ViolationsStats

    # convert and validate pydantic models GridCapacityConfig -> ConfigModel
    kw = ConfigModel.parse_obj(cfg.dict(exclude_unset=True)).dict(exclude_unset=True)

    kw.setdefault("load_power_factor", 0.9)
    kw.setdefault("gen_power_factor", 0.9)
    kw.setdefault("headroom_tolerance_p_mw", 5.0)
    kw.setdefault("max_iterations", 100)
    kw.setdefault("selected_buses_ids", None)
    kw.setdefault("selected_buses_ids", None)
    kw.setdefault("solver_opts", None)
    kw.setdefault("normal_limits", None)
    kw.setdefault("contingency_limits", None)

    capacity_analyser = CapacityAnalyser(**kw)

    headroom = []
    generate, total = capacity_analyser.create_buses_headroom_generator()

    for i, (bus_headroom, powerflow_count) in enumerate(generate()):
        stats = CeleryTaskMetadata.parse_obj(
            {
                "progress": round(i / total * 100),
                "powerflows": powerflow_count,
                "updated_at": int(time.time()),
            }
        )
        headroom.append(bus_headroom)
        on_progress(stats)

    # consider violations mapping moved into gridcapacity project
    violations = []
    bus_by_index = lambda idx: next(
        (b.number for b in Buses() if getattr(b, "pp_idx", b.number) == idx), None
    )

    for violation, limit_value_to_ss_violations in ViolationsStats.asdict().items():
        subsystems = ViolationsStats._get_subsystems_for_violation(violation)

        for limit, ss_violations in limit_value_to_ss_violations.items():
            for ss_idx, violated_values in ss_violations.items():
                ss = subsystems[ss_idx]
                v = {
                    "violation": violation,
                    "violated_values": violated_values,
                    "limit": limit,
                }

                if isinstance(subsystems, (Buses, SwingBuses)):
                    v["bus"] = {"number": bus_by_index(ss.number)}
                    if not v["bus"]["number"]:
                        logging.error(f"failed to map bus violation {v}")
                        continue

                elif isinstance(subsystems, Branches):
                    v["branch"] = {
                        "from_number": bus_by_index(ss.from_number),
                        "to_number": bus_by_index(ss.to_number),
                        "branch_id": ss.branch_id,
                    }
                    if not v["branch"]["from_number"] or not v["branch"]["to_number"]:
                        logging.error(f"failed to map branch violation {v}")
                        continue

                elif isinstance(subsystems, Trafos):
                    v["trafo"] = {
                        "from_number": bus_by_index(ss.from_number),
                        "to_number": bus_by_index(ss.to_number),
                        "trafo_id": ss.trafo_id,
                    }
                    if not v["trafo"]["from_number"] or not v["trafo"]["to_number"]:
                        logging.error(f"failed to map trafo violation {v}")
                        continue

                elif isinstance(subsystems, Trafos3w):
                    v["trafo3w"] = {
                        "wind1_number": bus_by_index(ss.wind1_number),
                        "wind2_number": bus_by_index(ss.wind2_number),
                        "wind3_number": bus_by_index(ss.wind3_number),
                        "trafo_id": ss.trafo_id,
                    }
                    if (
                        not v["trafo3w"]["wind1_number"]
                        or not v["trafo3w"]["wind2_number"]
                        or not v["trafo3w"]["wind3_number"]
                    ):
                        logging.error(f"failed to map trafo3w violation {v}")
                        continue

                violations.append(v)

    return json.dumps(
        {"headroom": headroom, "violations": violations}, **json_dump_kwargs
    )


@celery.task(
    bind=True,
    autoretry_for=(Exception,),
    dont_autoretry_for=(RuntimeError,),
    retry_backoff=2,
    max_retries=2,
)
def run_solver(self, data: str, only_affected_buses: bool = False):
    params = GridcapacityTaskParams.parse_raw(data)

    if not params.gridcapacityConfig:
        raise RuntimeError("Missing gridcapacity config")

    cfg = params.gridcapacityConfig
    scenario_id = str(params.id)

    cfg.case_name = os.path.join(os.environ["NET_DATA_ROOT"], cfg.case_name)
    if not os.path.exists(cfg.case_name):
        raise RuntimeError("Network case file cannot be found")

    if only_affected_buses and cfg.connection_scenario:
        cfg.selected_buses_ids = [str(x) for x in cfg.connection_scenario.keys()]

    def on_progress(x: CeleryTaskMetadata):
        x.scenario_id = scenario_id
        self.update_state(state=PROGRESS, meta=x.dict(exclude_none=True))
        logging.info(
            "progress={progress}%, powerflow_count={powerflows}".format(**x.dict())
        )

    logging.info(
        f"starting powerflow calculation with config {cfg.json(exclude_none=True, exclude_unset=True)}"
    )
    headroom_raw = calc_headroom(cfg, on_progress)

    headroom_model = ScenarioHeadroomSchema.parse_raw(headroom_raw)
    save_headroom(scenario_id=scenario_id, data=headroom_model)  # type: ignore

    m = CeleryTaskMetadata(
        scenario_id=scenario_id, progress=100, updated_at=int(time.time())
    )
    return m.dict(exclude_none=True)
