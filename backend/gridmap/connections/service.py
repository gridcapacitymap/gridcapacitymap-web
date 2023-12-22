import json
import uuid
from typing import List

import h3
from sqlalchemy import func, select

from ..database.dependencies import DatabaseSession
from ..networks.models import Bus
from ..networks.schemas import ConnectionRequestGeoFeature
from ..schemas.geo import GeoFeature, PointsGeoJson, PolygonGeometry, PolygonsGeoJson
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
        PolygonGeoFeature = GeoFeature[PolygonGeometry]
        features: List[PolygonGeoFeature] = []

        stmt = (
            select(
                models.ConnectionRequest.h3_ix,
                func.count(),
                func.sum(models.ConnectionRequest.power_increase),
            )
            .where(
                models.ConnectionRequest.bus_id.in_(
                    select(Bus.id).where(Bus.net_id == net_id)
                )
            )
            .group_by(models.ConnectionRequest.h3_ix)
        )
        result = await self.session.execute(stmt)

        for h, count, pwr in result.all():
            if not h or not pwr:
                continue

            geom = PolygonGeometry(
                coordinates=(h3.h3_to_geo_boundary(h, geo_json=True),)
            )
            props = {"id": h, "power_increase_total": pwr, "count": count}

            feat = PolygonGeoFeature(geometry=geom, properties=props)
            features.append(feat)

        return PolygonsGeoJson(features=features)

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

        if f.h3id:
            bounds = h3.h3_to_geo_boundary(f.h3id, geo_json=True)
            points = ", ".join(["{0} {1}".format(*latlon) for latlon in bounds])
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
