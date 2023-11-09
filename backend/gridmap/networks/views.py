import re
import uuid
from typing import Annotated, List, Union

from fastapi import APIRouter, Depends, Response, status

from ..auth.dependencies import get_current_user
from ..auth.schemas import AuthzScopes, OIDCIdentity
from ..schemas.geo import LinesGeoJson, PointsGeoJson
from .dependencies import NetworkSubsystemsServiceAnnotated
from .schemas import SerializedNetwork, SerializedSubsystems, SubsystemGeoJson

router = APIRouter(prefix="/nets", tags=["networks"])


@router.get("/{net_id}/geojson/buses", response_model=PointsGeoJson)
async def buses_geojson(
    net_id: uuid.UUID,
    service: NetworkSubsystemsServiceAnnotated,
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
):
    return await service.find_buses_geojson(net_id)


@router.get("/{net_id}/geojson/branches", response_model=LinesGeoJson)
async def branches_geojson(
    net_id: uuid.UUID,
    service: NetworkSubsystemsServiceAnnotated,
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
):
    return await service.find_branches_geojson(net_id)


@router.get("/{net_id}/geojson/trafos", response_model=LinesGeoJson)
async def trafos_geojson(
    net_id: uuid.UUID,
    service: NetworkSubsystemsServiceAnnotated,
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
):
    return await service.find_trafos_geojson(net_id)


@router.get("/", response_model=List[SerializedNetwork])
async def list_networks(
    service: NetworkSubsystemsServiceAnnotated,
    usr: Annotated[
        OIDCIdentity,
        Depends(get_current_user(required_permissions=[AuthzScopes.NET_ANY])),
    ],
):
    ids: Union[List[str], None] = []
    for p in usr.uma_permissions:
        # wildcard network permission is granted
        if "net:*" in p.scopes:
            ids = None
            break

        # permission is granted per network id
        for s in p.scopes:
            match = re.search(r"^net:([0-9a-fA-F-]{36}):", s)
            if match:
                ids.append(match.groups()[0])  # type: ignore

    return await service.list_networks(ids)


@router.post("/", response_model=SerializedNetwork)
async def create_network(
    payload: SerializedNetwork,
    service: NetworkSubsystemsServiceAnnotated,
    usr: Annotated[
        OIDCIdentity,
        Depends(get_current_user(required_permissions=[AuthzScopes.NET_ADMIN])),
    ],
):
    await service.create_network(payload)
    return Response(status_code=status.HTTP_201_CREATED)


@router.patch("/{net_id}", response_model=SerializedNetwork)
async def update_network_metadata(
    net_id: uuid.UUID,
    payload: SerializedNetwork,
    service: NetworkSubsystemsServiceAnnotated,
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
):
    await service.update_network(net_id, payload)
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.put(
    "/{net_id}/import/json",
    status_code=201,
    description=f"""
    Subsystems exported via gridcapacity for network. 
    Importing it here will result in replacing exising subsystems and their related entities.
    """,
)
async def import_net_subsystems(
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
    payload: SerializedSubsystems,
    service: NetworkSubsystemsServiceAnnotated,
):
    await service.import_subsystems(net_id, payload)
    return Response(status_code=status.HTTP_201_CREATED)


@router.put(
    "/{net_id}/import/geodata",
    status_code=201,
    description=f"Geospatial data for the network",
)
async def import_net_subsystems_geodata(
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
    payload: SubsystemGeoJson,
    service: NetworkSubsystemsServiceAnnotated,
):
    await service.import_subsystem_geodata(net_id, payload)
    return Response(status_code=status.HTTP_201_CREATED)
