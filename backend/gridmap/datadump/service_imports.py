import asyncio
import json
import logging
import threading
import time
import uuid
from functools import cache
from typing import Optional

from celery import states
from sqlalchemy import delete, select
from sqlalchemy.orm import load_only, raiseload

from ..connections.models import (
    AdminGeo,
    ConnectionRequest,
    InternalGeo,
    Milestone,
    Organization,
    User,
)
from ..database.dependencies import DatabaseSession
from ..database.helpers import get_or_create
from ..networks.models import Bus, Network
from ..scenarios.models import ConnectionScenario
from ..tasks.celeryapp import celery
from .helpers import get_distance
from .schemas import ConnectionsUnifiedSchema


class ThreadSafeCacheable:
    def __init__(self, co):
        self.co = co
        self.done = False
        self.result = None
        self.lock = threading.Lock()

    def __await__(self):
        while True:
            if self.done:
                return self.result
            if self.lock.acquire(blocking=False):
                self.result = yield from self.co.__await__()
                self.done = True
                return self.result
            else:
                yield from asyncio.sleep(0.005)


# Decorator enabling caching of coroutines
# https://stackoverflow.com/a/46723144
def cacheable(f):
    def wrapped(*args, **kwargs):
        r = f(*args, **kwargs)
        return ThreadSafeCacheable(r)

    return wrapped


class DataImportService:
    def __init__(self, session: DatabaseSession):
        self.session = session
        self.logger = logging.getLogger(self.__class__.__qualname__)

    async def _purge_connections(self, net: Network):
        # purge pending celery tasks before replacing network scenarios
        pending_scenarios = await self.session.scalars(
            select(ConnectionScenario)
            .where(
                # ConnectionScenario.net_id == net.id,
                ConnectionScenario.solver_task_id != None,
                ConnectionScenario.solver_task_status.not_in(states.READY_STATES),
            )
            .options(
                load_only(ConnectionScenario.id, ConnectionScenario.solver_task_id)
            )
        )
        for s in pending_scenarios:
            self.logger.info(
                f"Revoking solver_task_id={s.solver_task_id} for scenario_id={s.id}"
            )
            celery.control.revoke(s.solver_task_id, terminate=True)

        # remove scenarios except default one
        r = await self.session.execute(
            delete(ConnectionScenario).where(
                ConnectionScenario.id != net.default_scenario_id,
                ConnectionScenario.net_id == net.id,
            )
        )
        self.logger.info(f"deleting {r.rowcount} scenarios in network {net.id}")

        r = await self.session.execute(
            delete(ConnectionRequest).where(
                ConnectionRequest.bus_id.in_(select(Bus.id).where(Bus.net_id == net.id))
            )
        )
        self.logger.info(
            f"deleting {r.rowcount} connection requests in network {net.id}"
        )

        await self.session.flush()

    async def import_unified(
        self,
        net_id: uuid.UUID,
        model: ConnectionsUnifiedSchema,
        max_bus_distance: Optional[int] = None,
    ):
        start_time = time.time()

        @cache
        @cacheable
        async def get_or_create_cached(model, **kw):
            return await get_or_create(self.session, model, **kw)

        net = (
            await self.session.execute(select(Network).where(Network.id == net_id))
        ).scalar_one()

        # Step 1. Remove exising connection requests and scenarios
        await self._purge_connections(net)

        # Step 2. Insert new connection requests
        buses = list(
            await self.session.scalars(select(Bus).where(Bus.net_id == net.id))
        )
        buses_coords = [
            (
                b,
                json.loads(b.geom)["coordinates"][::-1],
            )
            for b in buses
            if b.geom
        ]

        conn_count = 0

        for i, x in enumerate(model.gridConnectionRequestList.gridConnectionRequest):
            c = x.to_sa()

            if x.connectivityNode.id:
                bus = next(
                    (b for b in buses if b.number == x.connectivityNode.id), None
                )
                if bus:
                    c.bus = bus

            elif max_bus_distance and x.extra and x.extra.wsg84lon and x.extra.wsg84lat:
                distances = [
                    (b, get_distance(latlon, (x.extra.wsg84lat, x.extra.wsg84lon)))
                    for (b, latlon) in buses_coords
                ]
                if distances:
                    (bus, distance) = min(distances, key=lambda x: x[1])

                    if distance >= 0 and distance <= max_bus_distance:
                        c.bus = bus
                    elif distance and bus:
                        self.logger.warn(
                            f"Closest bus {bus.name} is at {distance}m, max allowed is {max_bus_distance}m"
                        )

            if not c.bus:
                self.logger.error(f"No bus matched for connection request '{x.id}'")
                continue

            c.admin_geo = await get_or_create_cached(
                AdminGeo, **x.adminGeo.model_dump()
            )

            c.internal_geo = await get_or_create_cached(
                InternalGeo, level1_code=x.internalGeo.level1_code
            )

            c.account_manager = await get_or_create_cached(
                User, full_name=x.accountManager.fullName
            )

            c.grid_analyst = await get_or_create_cached(
                User, full_name=x.gridAnalyst.fullName
            )

            c.org = await get_or_create_cached(
                Organization, **x.organization.model_dump()
            )

            c.milestone = [
                Milestone(value=x.value, reason=x.reason, datetime=x.dateTime)
                for x in x.milestone
            ]

            self.session.add(c)
            conn_count += 1

        await self.session.flush()

        failed_conn_count = (
            len(model.gridConnectionRequestList.gridConnectionRequest) - conn_count
        )
        self.logger.info(
            f"Imported {conn_count} connection requests in {time.time() - start_time}s. Skipped {failed_conn_count}"
        )

        # Step 3. Insert new connection scenarios
        scenario_count = 0
        start_time = time.time()

        for i, sc in enumerate(model.gridConnectionScenarioList.gridConnectionScenario):
            ids = [v.refId for v in sc.connectionRequestsList]

            scenario_connections = await self.session.execute(
                select(ConnectionRequest)
                .options(raiseload("*"))
                .options(load_only(ConnectionRequest.id))
                .where(ConnectionRequest.project_id.in_(ids))
            )

            s = ConnectionScenario()
            s.code = sc.code
            s.name = sc.name
            s.priority = sc.priority
            s.created_at = sc.createdDateTime
            s.state = sc.state
            s.connection_requests = scenario_connections.scalars().unique().all()  # type: ignore
            s.net_id = net.id

            if sc.author:
                s.author = await get_or_create_cached(
                    User, full_name=sc.author.fullName
                )

            self.session.add(s)
            scenario_count += 1

        # Step 4. Commit transaction and cleanup
        await self.session.commit()

        get_or_create_cached.cache_clear()
        self.logger.info(
            f"Imported {scenario_count} scenarios in {time.time() - start_time}s"
        )
