import datetime
import json
from typing import Annotated

from geoalchemy2 import Geometry
from sqlalchemy.orm import mapped_column
from sqlalchemy.sql import func

# https://docs.sqlalchemy.org/en/20/orm/basic_relationships.html
# https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html#declarative-table-with-mapped-column
timestamp = Annotated[
    datetime.datetime,
    mapped_column(nullable=False, server_default=func.CURRENT_TIMESTAMP()),
]


# TODO add support of this column type in alembic
# see more at https://geoalchemy-2.readthedocs.io/en/latest/alembic.html#dealing-with-custom-types
#
# https://stackoverflow.com/a/63876070
class GeometryJSON(Geometry):
    """Geometry, as JSON

    The original Geometry class uses strings and transforms them using PostGIS functions:
        ST_GeomFromEWKT('SRID=4269;POINT(-71.064544 42.28787)');

    This class replaces the function with nice GeoJSON objects:
        {"type": "Point", "coordinates": [1, 1]}
    """

    from_text = "ST_GeomFromGeoJSON"
    as_binary = "ST_AsGeoJSON"
    ElementType = dict

    cache_ok = False

    def result_processor(self, dialect, coltype):
        # Postgres will give us JSON, thanks to `ST_AsGeoJSON()`. We just return it.
        def process(value):
            return value

        return process

    def bind_expression(self, bindvalue):
        return func.ST_SetSRID(super().bind_expression(bindvalue), self.srid)

    def bind_processor(self, dialect):
        # Dump incoming values as JSON
        def process(bindvalue):
            if bindvalue is None:
                return None
            else:
                return json.dumps(bindvalue)

        return process

    @property
    def python_type(self):
        return dict
