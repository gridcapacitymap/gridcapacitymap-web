import uuid
from dataclasses import dataclass
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.exceptions import HTTPException
from pydantic import constr
from sqlalchemy import select
from sqlalchemy.sql.expression import func

from ..auth.dependencies import get_current_user
from ..auth.schemas import AuthzScopes, OIDCIdentity
from ..cache.dependencies import cached_json_response
from ..networks.models import Bus
from ..schemas.geo import PointsGeoJson, PolygonsGeoJson
from ..schemas.paginated import PaginatedResponse, PaginationQueryParams
from .models import (
    ConnectionEnergyKindEnum,
    ConnectionKindEnum,
    ConnectionRequest,
    ConnectionStatusEnum,
)
from .schemas import ConnectionFilterParams, ConnectionRequestApiSchema
from .service import ConnectionRequestService

ConnectionRequestServiceAnnotated = Annotated[ConnectionRequestService, Depends()]

LatLon = constr(
    pattern="^[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?),\s*[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$"
)


@dataclass
class ConnectionListQuery(ConnectionFilterParams):
    bus_id: List[uuid.UUID] = Query([])
    status: Optional[ConnectionStatusEnum] = Query(None)

    connection_kind: Optional[ConnectionKindEnum] = Query(None)
    connection_energy_kind: Optional[ConnectionEnergyKindEnum] = Query(None)

    power_increase_gt: Optional[int] = Query(0, gte=0)
    power_increase_lt: Optional[int] = Query(1000, gt=0)

    area: List[LatLon] = Query(  # type: ignore
        [],
        max_length=20,
        example=[
            "-1.159660806906362,51.42506179933491",
            "0.21760569231242177,52.16253094685542",
            "0.6566671601841811,51.04017293392164",
        ],
        description="Coordinates (longitude, latitude) marking a polygon",
    )


router = APIRouter(prefix="/nets/{net_id}/connections", tags=["connections"])


@router.get("/", response_model=PaginatedResponse[ConnectionRequestApiSchema])
async def get_connection_requests(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
    service: ConnectionRequestServiceAnnotated,
    net_id: uuid.UUID,
    pagination: PaginationQueryParams = Depends(),
    filters: ConnectionListQuery = Depends(),
    cached=Depends(cached_json_response),
):
    if filters.area and len(filters.area) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Minimum 3 points are required to describe area",
        )

    (updated_at,) = (
        await service.session.execute(
            select(func.max(ConnectionRequest.updated_at))
            .join(Bus, ConnectionRequest.bus)
            .filter(Bus.net_id == net_id)
        )
    ).one()

    return await cached(
        updated_at.timestamp() if updated_at else None,
        service.paginate,
        net_id=net_id,
        ttl=3600,
        p=pagination,
        f=filters,
    )


@router.get("/geojson/density", response_model=PolygonsGeoJson)
async def get_connection_requests_density_geojson(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
    net_id: uuid.UUID,
    service: ConnectionRequestServiceAnnotated,
    cached=Depends(cached_json_response),
):
    (updated_at,) = (
        await service.session.execute(
            select(func.max(ConnectionRequest.updated_at))
            .join(Bus, ConnectionRequest.bus)
            .filter(Bus.net_id == net_id)
        )
    ).one()

    return await cached(
        updated_at.timestamp() if updated_at else None,
        service.build_density_geojson,
        ttl=30 * 24 * 3600,
        net_id=net_id,
    )


@router.get("/geojson/points", response_model=PointsGeoJson)
async def get_connection_requests_geojson(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
    net_id: uuid.UUID,
    service: ConnectionRequestServiceAnnotated,
    cached=Depends(cached_json_response),
):
    (updated_at,) = (
        await service.session.execute(
            select(func.max(ConnectionRequest.updated_at))
            .join(Bus, ConnectionRequest.bus)
            .filter(Bus.net_id == net_id)
        )
    ).one()

    return await cached(
        updated_at.timestamp() if updated_at else None,
        service.point_geojson,
        ttl=30 * 24 * 3600,
        net_id=net_id,
    )
