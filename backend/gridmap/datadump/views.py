import uuid
from typing import Annotated, List, Union

from fastapi import APIRouter, Depends, Query, Response, status

from ..auth.dependencies import get_current_user
from ..auth.schemas import AuthzScopes, OIDCIdentity
from .schemas import (
    ConnectionRequestSplunk,
    ConnectionScenarioSplunk,
    ConnectionsUnifiedSchema,
)
from .service_exports import DataExportService
from .service_imports import DataImportService

router = APIRouter(prefix="/nets/{net_id}/connections", tags=["connections"])

DataImportServiceAnnotated = Annotated[
    DataImportService,
    Depends(),
]

DataExportServiceAnnotated = Annotated[
    DataExportService,
    Depends(),
]


@router.get("/export/unified", response_model=ConnectionsUnifiedSchema)
async def export_connections_json(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[
                    AuthzScopes.NET_UPDATE_BY_ID,
                    AuthzScopes.NET_ADMIN,
                ]
            )
        ),
    ],
    net_id: uuid.UUID,
    service: DataExportServiceAnnotated,
):
    return await service.export_unified(net_id)


@router.get(
    "/export/splunk",
    response_model=List[Union[ConnectionRequestSplunk, ConnectionScenarioSplunk]],
)
async def export_splunk_json(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[
                    AuthzScopes.NET_UPDATE_BY_ID,
                    AuthzScopes.NET_ADMIN,
                ]
            )
        ),
    ],
    net_id: uuid.UUID,
    service: DataExportServiceAnnotated,
):
    return await service.export_splunk(net_id)


@router.put(
    "/import/unified",
    status_code=status.HTTP_201_CREATED,
    description="Import connection requests & scenarios from json. Replaces existing entities in database",
)
async def import_connections_unified_json(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[
                    AuthzScopes.NET_UPDATE_BY_ID,
                    AuthzScopes.NET_ADMIN,
                ]
            )
        ),
    ],
    payload: ConnectionsUnifiedSchema,
    service: DataImportServiceAnnotated,
    net_id: uuid.UUID,
    max_bus_distance: int = Query(
        default=0,
        ge=0,
        le=100000,
        description="Max distance from bus to connection request",
    ),
):
    await service.import_unified(net_id, payload, max_bus_distance)
    return Response(status_code=status.HTTP_201_CREATED)
