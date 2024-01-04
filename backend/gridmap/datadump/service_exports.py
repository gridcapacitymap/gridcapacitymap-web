import uuid
from typing import List, Union

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..connections.models import ConnectionRequest
from ..database.dependencies import DatabaseSession
from ..networks.models import Bus
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


class DataExportService:
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
