import json
import math
import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select, text

from ..database.dependencies import DatabaseSession
from ..networks.schemas import ConnectionRequestGeoFeature
from ..schemas.geo import PointsGeoJson, PolygonsGeoJson
from ..schemas.paginated import PaginatedResponse, PaginationQueryParams
from . import models
from .schemas import (
    ConnectionFilterParams,
    ConnectionRequestApiSchema,
    ConnectionRequestUnified,
)


class ConnectionRequestService:
    def __init__(self, session: DatabaseSession):
        self.session = session

    async def build_density_geojson(self, net_id: uuid.UUID) -> PolygonsGeoJson:
        # get area (in sq meters) of the target network
        s = text(
            "SELECT ST_Area(ST_Envelope(ST_Union(geom))::geography) AS geom FROM network_buses WHERE net_id = :net_id"
        )
        s = s.bindparams(net_id=net_id)
        result = await self.session.execute(s)
        (area,) = result.one()

        if not area:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Network area could not be determined",
            )

        hex_approx_area = area / 1600  # approx desired number of hexagons for the area

        # calculate hex side (in meters)
        hex_size = round(math.sqrt(hex_approx_area / (1.5 * math.sqrt(3))))

        # https://postgis.net/docs/en/ST_HexagonGrid.html
        # https://stackoverflow.com/a/49985343
        # build geojson with connection request density based on total power increase
        stmt = text(
            """WITH bbox AS (
    SELECT ST_Transform(ST_Envelope(ST_Union(geom)), 3857) AS geom FROM network_buses WHERE net_id = :net_id
), hexagons AS (
    SELECT ST_HexagonGrid(:hex_size, geom) AS hex FROM bbox
), hexOnPoints AS (
    SELECT ST_Transform((hex).geom, 4326) as geom, SUM(connection_requests.power_increase) as power_increase_total FROM hexagons 
    JOIN connection_requests
        ON ST_Intersects((hex).geom, ST_Transform(connection_requests.geom, 3857))
    GROUP BY (hex).geom
) SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(ST_AsGeoJSON(hexOnPoints.*)::json)
) FROM hexOnPoints
"""
        )
        stmt = stmt.bindparams(net_id=net_id, hex_size=hex_size)
        result = await self.session.execute(stmt)
        (g,) = result.one()
        return g

    async def point_geojson(self, net_id: uuid.UUID) -> PointsGeoJson:
        requests = (
            await self.session.scalars(
                select(models.ConnectionRequest)
                .join(models.Bus, models.ConnectionRequest.bus)
                .filter(models.Bus.net_id == net_id)
            )
        ).unique()

        # Build connection requests geojson layer data
        # geojson uses wsg84 projection
        # https://geojson.org/
        # https://datatracker.ietf.org/doc/html/rfc7946#section-4
        features = []

        for item in requests:
            feat = ConnectionRequestGeoFeature(
                geometry=json.loads(item.geom),  # type: ignore
                properties=ConnectionRequestUnified.from_sa(item),
            )
            d = feat.model_dump(
                exclude={
                    "properties": {
                        "extra",
                        "adminGeo",
                        "accountManager",
                        "internalGeo",
                        "gridAnalyst",
                        "organization",
                        "milestone",
                    }
                }
            )
            features.append(d)

        return PointsGeoJson(features=features)

    async def paginate(
        self, net_id: uuid.UUID, p: PaginationQueryParams, f: ConnectionFilterParams
    ):
        stmt = (
            select(models.ConnectionRequest)
            .join(models.Bus, models.ConnectionRequest.bus)
            .filter(models.Bus.net_id == net_id)
        )
        if f.status:
            stmt = stmt.filter(models.ConnectionRequest.status == f.status)

        if f.connection_kind:
            stmt = stmt.filter(
                models.ConnectionRequest.connection_kind == f.connection_kind
            )

        if f.connection_energy_kind:
            stmt = stmt.filter(
                models.ConnectionRequest.connection_energy_kind
                == f.connection_energy_kind
            )

        if f.power_increase_gt:
            stmt = stmt.filter(
                models.ConnectionRequest.power_increase > f.power_increase_gt
            )

        if f.power_increase_lt:
            stmt = stmt.filter(
                models.ConnectionRequest.power_increase < f.power_increase_lt
            )

        if f.bus_id:
            stmt = stmt.filter(models.ConnectionRequest.bus_id.in_(f.bus_id))

        if f.area:
            wkt_points = [re.sub(r",\s*", " ", x) for x in f.area]
            if wkt_points[-1] != wkt_points[0]:
                wkt_points = wkt_points + wkt_points[0:1]
            points = ", ".join(wkt_points)

            polygon = func.ST_GEOMFROMTEXT(f"SRID=4326;POLYGON(({points}))")
            stmt = stmt.filter(func.ST_Contains(polygon, models.ConnectionRequest.geom))

        count = await self.session.scalar(
            select(func.count()).select_from(stmt.subquery())
        )
        results = await self.session.scalars(stmt.limit(p.limit).offset(p.offset))

        return PaginatedResponse[ConnectionRequestApiSchema](
            count=count or 0,
            items=[ConnectionRequestApiSchema.from_sa(x) for x in results.unique()],
        )
