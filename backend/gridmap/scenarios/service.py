import uuid
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy import func, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload

from ..connections.models import ConnectionEnergyKindEnum, User
from ..database.dependencies import DatabaseSession
from ..headroom.schemas import GridCapacityConfig
from ..schemas.paginated import PaginatedResponse
from .models import ConnectionScenario, scenario_requests_m2m
from .schemas import ScenarioBaseApiSchema, ScenarioDetailsApiSchema


class ConnectionScenarioService:
    def __init__(self, session: DatabaseSession):
        self.session = session

    async def filter(
        self,
        limit: int,
        offset: int,
        net_id: Union[uuid.UUID, None],
        author: Union[str, None],
    ):
        connections_count_sq = (
            select(
                scenario_requests_m2m.c.scenario_id,
                func.count(scenario_requests_m2m.c.scenario_id).label(
                    "connections_count"
                ),
            )
            .group_by(scenario_requests_m2m.c.scenario_id)
            .subquery()
        )

        q = (
            select(
                ConnectionScenario,
                connections_count_sq.c.connections_count,
            )
            .join(
                connections_count_sq,
                connections_count_sq.c.scenario_id == ConnectionScenario.id,
                isouter=True,
            )
            .options(joinedload(ConnectionScenario.author))
            .options(joinedload(ConnectionScenario.net))
        )

        if net_id:
            q = q.filter(ConnectionScenario.net_id == net_id)

        if author:
            q = q.join(ConnectionScenario.author).filter(User.full_name == author)

        result = await self.session.execute(
            q.order_by(ConnectionScenario.created_at).limit(limit).offset(offset)
        )
        count = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        )

        items: List[ScenarioBaseApiSchema] = []

        for scenario, conn_count in result:
            x = ScenarioBaseApiSchema.from_sa(scenario)
            x.connectionRequestsCount = conn_count or 0
            items.append(x)

        return PaginatedResponse[ScenarioBaseApiSchema](count=count or 0, items=items)

    async def find_scenario_details(
        self, scenario_id: uuid.UUID, net_id: uuid.UUID
    ) -> ScenarioDetailsApiSchema:
        scenario = await self.session.scalar(
            select(ConnectionScenario)
            .filter(
                ConnectionScenario.id == scenario_id,
                ConnectionScenario.net_id == net_id,
            )
            .options(joinedload("*"))
        )

        if not scenario:
            raise NoResultFound

        connection_scenario_cfg: Dict[str, Dict[str, Tuple[float]]] = {}

        for i, conn in enumerate(scenario.connection_requests):
            if not conn.bus:
                continue

            pwr = connection_scenario_cfg.setdefault(
                str(conn.bus.number), {"load": (0.0,), "gen": (0.0,)}
            )

            if conn.connection_energy_kind == ConnectionEnergyKindEnum.CONSUMPTION:
                pwr["load"] = (pwr["load"][0] + conn.power_increase,)
            elif conn.connection_energy_kind == ConnectionEnergyKindEnum.PRODUCTION:
                pwr["gen"] = (pwr["gen"][0] + conn.power_increase,)
            elif conn.connection_energy_kind == ConnectionEnergyKindEnum.BOTH:
                if conn.power_increase > 0:
                    pwr["gen"] = (pwr["gen"][0] + conn.power_increase,)
                else:
                    pwr["load"] = (pwr["load"][0] + conn.power_increase,)

        response = ScenarioDetailsApiSchema.from_sa(scenario)

        cfg: Dict[str, Any] = scenario.net.gridcapacity_cfg or {}
        if connection_scenario_cfg:
            cfg.update({"connection_scenario": connection_scenario_cfg})

        response.gridcapacityConfig = GridCapacityConfig.model_validate(cfg)
        return response
