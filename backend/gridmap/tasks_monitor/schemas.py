from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class CeleryTaskMetadata(BaseModel):
    progress: Optional[int] = 0
    powerflows: Optional[int] = 0
    updated_at: Optional[int] = 0
    state: Optional[str] = None
    state_reason: Optional[str] = None
    scenario_id: Optional[str] = None
    task_id: Optional[str] = None


class WebsocketSubscribeRequest(BaseModel):
    event: Literal["subscribe"]
    channel: Literal["scenarios"]
    ids: List[UUID]
