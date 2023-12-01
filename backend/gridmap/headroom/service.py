import logging
import uuid

from celery import states
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, joinedload, load_only

from ..networks.models import Branch, Bus, Trafo
from ..scenarios.models import ConnectionScenario
from .models import BusHeadroom, ScenarioViolation
from .schemas import BranchLF, ScenarioHeadroomSchema, TrafoLF


class ScenarioHeadroomService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def update_scenario_headroom(
        self, scenario_id: uuid.UUID, data: ScenarioHeadroomSchema
    ):
        scenario = await self.session.scalar(
            select(ConnectionScenario)
            .options(joinedload("*"))
            .filter(ConnectionScenario.id == scenario_id)
        )

        if not scenario:
            raise RuntimeError("Connection scenario was not found")

        buses, branches, trafos = await self._subsystems(net_id=scenario.net_id)  # type: ignore

        await self.session.execute(
            delete(BusHeadroom).where(BusHeadroom.scenario_id == scenario.id)
        )
        await self.session.flush()

        for hr in data.headroom:
            bus = next((b for b in buses if hr.bus.number in [b.number, b.name]), None)
            if not bus:
                logging.error(f"Failed to link headroom to subsystems: {hr}")
                continue

            m = BusHeadroom()
            m.scenario_id = scenario.id
            m.bus_id = bus.id
            m.actual_load_mva = hr.actual_load_mva  # type: ignore
            m.actual_gen_mva = hr.actual_gen_mva  # type: ignore
            m.load_avail_mva = hr.load_avail_mva  # type: ignore
            m.gen_avail_mva = hr.gen_avail_mva  # type: ignore

            if hr.load_lf:
                m.load_lf_v = hr.load_lf.v

                if isinstance(hr.load_lf.ss, BranchLF):
                    m.load_lf_branch_id = next(
                        (
                            b.id
                            for b in branches
                            if hr.load_lf.ss.from_number
                            in [b.from_bus.number, b.from_bus.name]
                            and hr.load_lf.ss.to_number
                            in [b.to_bus.number, b.to_bus.name]
                            and hr.load_lf.ss.branch_id == b.branch_id
                        ),
                        None,
                    )

                if isinstance(hr.load_lf.ss, TrafoLF):
                    m.load_lf_trafo_id = next(
                        (
                            t.id
                            for t in trafos
                            if hr.load_lf.ss.from_number
                            in [t.from_bus.number, t.from_bus.name]
                            and hr.load_lf.ss.to_number
                            in [t.to_bus.number, t.to_bus.name]
                            and hr.load_lf.ss.trafo_id == t.trafo_id
                        ),
                        None,
                    )

            if hr.gen_lf:
                m.gen_lf_v = hr.gen_lf.v

                if isinstance(hr.gen_lf.ss, BranchLF):
                    m.gen_lf_branch_id = next(
                        (
                            b.id
                            for b in branches
                            if hr.gen_lf.ss.from_number
                            in [b.from_bus.number, b.from_bus.name]
                            and hr.gen_lf.ss.to_number
                            in [b.to_bus.number, b.to_bus.name]
                            and hr.gen_lf.ss.branch_id == b.branch_id
                        ),
                        None,
                    )

                if isinstance(hr.gen_lf.ss, TrafoLF):
                    m.gen_lf_trafo_id = next(
                        (
                            t.id
                            for t in trafos
                            if hr.gen_lf.ss.from_number
                            in [t.from_bus.number, t.from_bus.name]
                            and hr.gen_lf.ss.to_number
                            in [t.to_bus.number, t.to_bus.name]
                            and hr.gen_lf.ss.trafo_id == t.trafo_id
                        ),
                        None,
                    )

            self.session.add(m)

        await self.session.execute(
            update(ConnectionScenario)
            .where(ConnectionScenario.id == scenario_id)
            .values(solver_task_status=states.SUCCESS)
        )

        await self.session.commit()

        # Violation stats
        await self.session.execute(
            delete(ScenarioViolation).where(
                ScenarioViolation.scenario_id == scenario.id
            )
        )
        await self.session.flush()

        for item in data.violations:
            model = ScenarioViolation()
            model.scenario_id = scenario.id
            model.violation = item.violation
            model.limit = item.limit
            model.violated_values = item.violated_values  # type: ignore

            if item.bus:
                model.bus_id = next(
                    (b.id for b in buses if item.bus.number in [b.number, b.name]), None
                )

            elif item.branch:
                model.branch_id = next(
                    (
                        b.id
                        for b in branches
                        if item.branch.from_number
                        in [b.from_bus.number, b.from_bus.name]
                        and item.branch.to_number in [b.to_bus.number, b.to_bus.name]
                        and item.branch.branch_id == b.branch_id
                    ),
                    None,
                )

            elif item.trafo:
                model.trafo_id = next(
                    (
                        b.id
                        for b in trafos
                        if item.trafo.from_number
                        in [b.from_bus.number, b.from_bus.name]
                        and item.trafo.to_number in [b.to_bus.number, b.to_bus.name]
                        and item.trafo.trafo_id == b.trafo_id
                    ),
                    None,
                )

            elif item.trafo3w:
                # TODO
                continue

            else:
                continue

            self.session.add(model)

        await self.session.commit()

    async def _subsystems(self, net_id: uuid.UUID):
        buses_result = await self.session.execute(
            select(Bus)
            .options(load_only(Bus.id, Bus.number, Bus.name))
            .filter(
                Bus.net_id == net_id,
            )
        )
        buses = list(buses_result.scalars().all())

        BranchBusFrom = aliased(Bus)
        BranchBusTo = aliased(Bus)
        branches_result = await self.session.scalars(
            select(Branch)
            .join(BranchBusFrom, Branch.from_bus)
            .join(BranchBusTo, Branch.to_bus)
            .where(BranchBusFrom.net_id == net_id, BranchBusTo.net_id == net_id)
        )
        branches = list(branches_result.all())

        TrafoBusFrom = aliased(Bus)
        TrafoBusTo = aliased(Bus)
        trafos_result = await self.session.scalars(
            select(Trafo)
            .join(TrafoBusFrom, Trafo.from_bus)
            .join(TrafoBusTo, Trafo.to_bus)
            .where(TrafoBusFrom.net_id == net_id, TrafoBusTo.net_id == net_id)
        )
        trafos = list(trafos_result.all())

        return buses, branches, trafos
