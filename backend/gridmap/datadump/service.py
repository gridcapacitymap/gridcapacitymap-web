import logging
import uuid
from typing import List, Optional, Union

from geoalchemy2 import functions as func
from geoalchemy2.types import Geography, Geometry
from sqlalchemy import Float, asc, cast, delete, desc, select
from sqlalchemy.orm import joinedload

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
from .schemas import (
    ConnectionRequestSplunk,
    ConnectionRequestUnified,
    ConnectionRequestUnifiedList,
    ConnectionScenarioSplunk,
    ConnectionScenarioUnified,
    ConnectionScenarioUnifiedList,
    ConnectionsUnifiedSchema,
)


class DataDumpService:
    def __init__(self, session: DatabaseSession):
        self.session = session

    async def _query_export(self, net_id: uuid.UUID):
        connections_q = await self.session.scalars(
            select(ConnectionRequest)
            .options(joinedload(ConnectionRequest.admin_geo))
            .options(joinedload(ConnectionRequest.bus))
            .options(joinedload(ConnectionRequest.account_manager))
            .options(joinedload(ConnectionRequest.internal_geo))
            .options(joinedload(ConnectionRequest.grid_analyst))
            .options(joinedload(ConnectionRequest.org))
            .options(joinedload(ConnectionRequest.milestone))
            .join(Bus, ConnectionRequest.bus)
            .filter(Bus.net_id == net_id)
        )
        connections = connections_q.unique()

        scenarios_q = await self.session.scalars(
            select(ConnectionScenario)
            .options(joinedload(ConnectionScenario.author))
            .options(joinedload(ConnectionScenario.connection_requests))
            .options(joinedload(ConnectionScenario.net))
            .filter(ConnectionScenario.net_id == net_id)
        )

        scenarios = scenarios_q.unique()
        return connections, scenarios

    async def export_splunk(self, net_id: uuid.UUID):
        connections, scenarios = await self._query_export(net_id)

        items: List[Union[ConnectionRequestSplunk, ConnectionScenarioSplunk]] = []

        # array for splunk - as separate json output
        for conn in connections:
            item = ConnectionRequestSplunk.from_sa(conn)
            item.time = item.createdDateTime
            item.source = "connectionRequest"
            items.append(item)

        for sc in scenarios:
            item = ConnectionScenarioSplunk.from_sa(sc)
            item.time = item.createdDateTime
            item.source = "scenario"
            items.append(item)

        return items

    async def export_unified(self, net_id: uuid.UUID):
        connections, scenarios = await self._query_export(net_id)

        return ConnectionsUnifiedSchema(
            gridConnectionRequestList=ConnectionRequestUnifiedList(
                gridConnectionRequest=[
                    ConnectionRequestUnified.from_sa(x) for x in connections
                ]
            ),
            gridConnectionScenarioList=ConnectionScenarioUnifiedList(
                gridConnectionScenario=[
                    ConnectionScenarioUnified.from_sa(x) for x in scenarios
                ]
            ),
        )

    async def import_unified(
        self,
        net_id: uuid.UUID,
        model: ConnectionsUnifiedSchema,
        max_bus_distance: Optional[int] = None,
    ):
        net = (
            await self.session.execute(
                select(Network).where(
                    Network.id == net_id,
                )
            )
        ).scalar_one()

        # remove network scenarios except default ones
        stmt = delete(ConnectionScenario).where(
            ConnectionScenario.id != net.default_scenario_id,
            ConnectionScenario.net_id == net_id,
        )
        r = await self.session.execute(stmt)
        logging.info(f"deleting {r.rowcount} scenarios in network {net_id}")

        net_buses_sq = select(Bus.id).where(
            Bus.net_id == net_id,
        )
        r = await self.session.execute(
            delete(ConnectionRequest).where(ConnectionRequest.bus_id.in_(net_buses_sq))
        )
        logging.info(f"deleting {r.rowcount} connection requests in network {net_id}")

        await self.session.flush()

        for i, x in enumerate(model.gridConnectionRequestList.gridConnectionRequest):
            c = x.to_sa()

            c.admin_geo = await get_or_create(
                self.session, AdminGeo, **x.adminGeo.model_dump()
            )

            c.internal_geo = await get_or_create(
                self.session, InternalGeo, level1_code=x.internalGeo.level1_code
            )

            c.account_manager = await get_or_create(
                self.session, User, full_name=x.accountManager.fullName
            )

            c.grid_analyst = await get_or_create(
                self.session, User, full_name=x.gridAnalyst.fullName
            )

            if x.connectivityNode.id:
                c.bus = (
                    await self.session.execute(
                        select(Bus).where(
                            Bus.number == x.connectivityNode.id, Bus.net_id == net_id
                        )
                    )
                ).scalar_one()
            elif max_bus_distance and x.extra and x.extra.wsg84lon and x.extra.wsg84lat:
                distance = (
                    func.ST_GeogFromWKB(Bus.geom)
                    .distance_centroid(
                        func.ST_GeogFromWKB(
                            func.ST_MakePoint(x.extra.wsg84lon, x.extra.wsg84lat)
                        )
                    )
                    .cast(Float)
                    .label("distance")
                )
                stmt = (
                    select(
                        Bus,
                        distance,
                    )
                    .where(Bus.net_id == net_id)
                    .order_by(distance)
                )
                row = (await self.session.execute(stmt)).first()

                if row:
                    (bus, distance) = row
                    if distance and distance <= max_bus_distance:
                        c.bus = bus
                        logging.info(
                            f"Connection {x.id} is auto-traced to closest bus {c.bus} at distance {distance}m"
                        )
                    elif distance:
                        logging.error(
                            f"Closest bus {c.bus} is beyond threshold distance of {max_bus_distance}m"
                        )

            if not c.bus:
                logging.error(
                    f"Failed to find connectivityNode for connection {x.id}. Droppping connection request"
                )
                continue

            c.org = await get_or_create(
                self.session, Organization, **x.organization.model_dump()
            )

            c.milestone = [
                Milestone(value=x.value, reason=x.reason, datetime=x.dateTime)
                for x in x.milestone
            ]

            self.session.add(c)

        await self.session.flush()

        # replace connection scenarios
        scenarios = model.gridConnectionScenarioList.gridConnectionScenario

        for i, sc in enumerate(scenarios):
            ids = [v.refId for v in sc.connectionRequestsList]

            conn_q = await self.session.execute(
                select(ConnectionRequest).where(ConnectionRequest.project_id.in_(ids))
            )

            author: Optional[User] = None
            if sc.author:
                author = await get_or_create(
                    self.session, User, full_name=sc.author.fullName
                )

            s = ConnectionScenario()
            s.code = sc.code
            s.name = sc.name
            s.priority = sc.priority
            s.created_at = sc.createdDateTime
            s.state = sc.state
            s.author = author
            s.connection_requests = conn_q.scalars().unique().all()  # type: ignore
            s.net_id = net_id  # type: ignore
            self.session.add(s)

        await self.session.commit()
