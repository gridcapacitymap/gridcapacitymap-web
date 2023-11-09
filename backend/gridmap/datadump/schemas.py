from datetime import datetime
from typing import List, Optional

from ..connections.schemas import ConnectionRequestUnified
from ..scenarios.schemas import ConnectionScenarioUnified
from ..schemas import CamelModel


class ConnectionRequestUnifiedList(CamelModel):
    gridConnectionRequest: List[ConnectionRequestUnified]


class ConnectionScenarioUnifiedList(CamelModel):
    gridConnectionScenario: List[ConnectionScenarioUnified]


class ConnectionsUnifiedSchema(CamelModel):
    gridConnectionRequestList: ConnectionRequestUnifiedList
    gridConnectionScenarioList: ConnectionScenarioUnifiedList


class ConnectionRequestSplunk(ConnectionRequestUnified):
    time: Optional[datetime] = None
    source: Optional[str] = None


class ConnectionScenarioSplunk(ConnectionScenarioUnified):
    time: Optional[datetime] = None
    source: Optional[str] = None
