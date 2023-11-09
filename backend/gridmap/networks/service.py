import datetime
import uuid
from typing import List, Optional

from sqlalchemy import and_, delete, or_, select, text
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload

from ..database.dependencies import DatabaseSession
from ..schemas.geo import (
    LinesGeoJson,
    LineStringGeometry,
    PointGeometry,
    PointsGeoJson,
    PolygonGeometry,
)
from .models import Branch, Bus, Generator, Load, Network, Trafo, Trafo3w
from .schemas import (
    SerializedNetwork,
    SerializedSubsystems,
    SubsystemGeoJson,
    SubsystemTypeEnum,
)


class NetworkSubsystemsService:
    def __init__(self, session: DatabaseSession):
        self.session = session

    async def find_buses_geojson(self, net_id: uuid.UUID):
        buses = await self.session.scalars(select(Bus).filter(Bus.net_id == net_id))
        return PointsGeoJson(features=[x.to_feature() for x in buses if x.geom])

    async def find_branches_geojson(self, net_id: uuid.UUID):
        branches = await self.session.scalars(
            select(Branch).join(
                Bus, and_(Bus.id == Branch.from_bus_id, Bus.net_id == net_id)
            )
        )
        return LinesGeoJson(features=[x.to_feature() for x in branches if x.geom])

    async def find_trafos_geojson(self, net_id: uuid.UUID):
        trafos = await self.session.scalars(
            select(Trafo).join(Bus, Trafo.from_bus).filter(Bus.net_id == net_id)
        )
        trafos3w = await self.session.scalars(
            select(Trafo3w).join(Bus, Trafo3w.w1_bus).filter(Bus.net_id == net_id)
        )

        tr_collection = LinesGeoJson(
            features=[x.to_feature() for x in trafos if x.geom]
        )
        tr3w_collection = LinesGeoJson(
            features=[x.to_feature() for x in trafos3w if x.geom]
        )

        tr_collection.features.extend(tr3w_collection.features)

        return tr_collection

    async def list_networks(self, ids: Optional[List[str]] = None):
        stmt = select(Network)
        if type(ids) == list:
            stmt = stmt.filter(Network.id.in_(ids))

        nets = await self.session.scalars(stmt)

        # TODO select with join or subquery along with networks
        bounds_stmt = text(
            "SELECT net_id, ST_AsGeoJSON(ST_Envelope(ST_Union(geom))) AS table_extent FROM network_buses GROUP BY net_id"
        )
        bounds = (await self.session.execute(bounds_stmt)).all()

        items = []
        for x in nets.all():
            m = SerializedNetwork.model_validate(x.to_dict())
            m.geom = next(
                (
                    PolygonGeometry.model_validate_json(geom)
                    for (net_id, geom) in bounds
                    if net_id == x.id and geom
                ),
                None,
            )
            items.append(m)

        return items

    async def create_network(self, payload: SerializedNetwork):
        model = Network(
            title=payload.title,
            created_at=datetime.datetime.now(),
            gridcapacity_cfg=payload.gridcapacity_cfg.model_dump(exclude_none=True)
            if payload.gridcapacity_cfg
            else {},
            solver_backend=payload.solver_backend,
        )
        self.session.add(model)
        await self.session.commit()
        return model

    async def update_network(self, net_id: uuid.UUID, payload: SerializedNetwork):
        model = await self.session.get(Network, net_id)
        if not model:
            raise NoResultFound

        if payload.default_scenario_id:
            model.default_scenario_id = payload.default_scenario_id  # type: ignore
        if payload.title:
            model.title = payload.title
        if payload.gridcapacity_cfg:
            model.gridcapacity_cfg = payload.gridcapacity_cfg.model_dump(
                exclude_none=True
            )

        self.session.add(model)
        await self.session.commit()

    async def import_subsystems(self, net_id: uuid.UUID, payload: SerializedSubsystems):
        async def find_bus(*expr):
            res = await self.session.execute(
                select(Bus).where(Bus.net_id == net_id, *expr)
            )
            return res.scalar_one()

        await self.session.execute(delete(Bus).where(Bus.net_id == net_id))

        # Add buses
        for pb in payload.buses:
            b = Bus(**pb.model_dump())
            b.net_id = net_id  # type: ignore
            self.session.add(b)

        await self.session.commit()

        # Add branches
        for pbr in payload.branches:
            br = Branch()

            br.from_bus = await find_bus(Bus.number == pbr.from_number)
            br.to_bus = await find_bus(Bus.number == pbr.to_number)

            br.in_service = pbr.in_service
            br.branch_id = pbr.branch_id
            self.session.add(br)

        await self.session.commit()

        # Add trafos
        for pt in payload.trafos:
            t = Trafo()

            t.from_bus = await find_bus(Bus.number == pt.from_number)
            t.to_bus = await find_bus(Bus.number == pt.to_number)

            t.in_service = pt.in_service
            t.trafo_id = pt.trafo_id
            self.session.add(t)

        await self.session.commit()

        # Add 3 winding trafos
        for pt3w in payload.trafos3w:
            t3w = Trafo3w()

            t3w.w1_bus = await find_bus(Bus.number == pt3w.wind1_number)
            t3w.w2_bus = await find_bus(Bus.number == pt3w.wind2_number)
            t3w.w3_bus = await find_bus(Bus.number == pt3w.wind3_number)

            t3w.in_service = pt3w.in_service
            t3w.trafo_id = pt3w.trafo_id

            self.session.add(t3w)

        await self.session.commit()

        # Add loads
        for pl in payload.loads:
            d = pl.model_dump()
            bus_id = d.pop("number")
            l = Load(**d)
            l.bus = await find_bus(Bus.number == bus_id)
            self.session.add(l)

        await self.session.commit()

        # Add generators
        for pg in payload.gens:
            d = pg.model_dump()
            bus_id = d.pop("number")
            g = Generator(**d)
            g.bus = await find_bus(Bus.number == bus_id)
            self.session.add(g)

        await self.session.commit()

    async def import_subsystem_geodata(
        self, net_id: uuid.UUID, payload: SubsystemGeoJson
    ):
        network_buses = list(
            await self.session.scalars(select(Bus).filter(Bus.net_id == net_id))
        )
        network_bus_ids = [x.id for x in network_buses]

        if not len(network_bus_ids):
            raise NoResultFound

        bus_features = [
            x for x in payload.features if x.properties.typ == SubsystemTypeEnum.BUS
        ]
        branch_features = [
            x for x in payload.features if x.properties.typ == SubsystemTypeEnum.BRANCH
        ]
        trafo_features = [
            x for x in payload.features if x.properties.typ == SubsystemTypeEnum.TRAFO
        ]

        # Update bus geometry
        for bus in network_buses:
            bus_f = next(
                (x for x in bus_features if x.properties.number == bus.number), None
            )

            if bus_f:
                bus.geom = bus_f.geometry.model_dump()  # type: ignore
                print(f"-> update bus {bus.id} geom to {bus.geom}")

        await self.session.flush()

        # Update branches(lines) geometry
        network_branches = await self.session.scalars(
            select(Branch)
            .options(joinedload("*"))
            .filter(
                or_(
                    Branch.from_bus_id.in_(network_bus_ids),
                    Branch.to_bus_id.in_(network_bus_ids),
                )
            )
        )
        for br in network_branches.unique():
            br_f = next(
                (
                    x
                    for x in branch_features
                    if x.properties.from_number == br.from_bus.number
                    and x.properties.to_number == br.to_bus.number
                ),
                None,
            )

            if br_f:
                br.geom = br_f.geometry.model_dump()  # type: ignore
                print(f"-> update branch {br.id} geom to {br.geom}")

            elif not br_f and br.from_bus.geom and br.to_bus.geom:
                start = PointGeometry.model_validate(br.from_bus.geom).coordinates  # type: ignore
                end = PointGeometry.model_validate(br.to_bus.geom).coordinates  # type: ignore

                br.geom = LineStringGeometry(coordinates=[start, end]).model_dump()  # type: ignore
                print(f"-> update branch {br.id} geom to {br.geom} [auto-trace]")

        # Update trafos geometry
        trafos = await self.session.scalars(
            select(Trafo)
            .options(joinedload("*"))
            .filter(
                or_(
                    Trafo.from_bus_id.in_(network_bus_ids),
                    Trafo.to_bus_id.in_(network_bus_ids),
                )
            )
        )
        for t in trafos.unique():
            t_f = next(
                (
                    x
                    for x in trafo_features
                    if x.properties.from_number == t.from_bus.number
                    or x.properties.to_number == t.to_bus.number
                ),
                None,
            )
            if t_f:
                t.geom = br_f.geometry.model_dump()  # type: ignore
                print(f"-> update trafo {t.id} geom to {t.geom}")

            elif not t_f and t.from_bus.geom and t.to_bus.geom:
                start = PointGeometry.model_validate(t.from_bus.geom).coordinates  # type: ignore
                end = PointGeometry.model_validate(t.to_bus.geom).coordinates  # type: ignore

                t.geom = LineStringGeometry(coordinates=[start, end]).model_dump()  # type: ignore
                print(f"-> update trafo {t.id} geom to {t.geom} [auto-trace]")

        # commit changes across models within session
        await self.session.commit()
