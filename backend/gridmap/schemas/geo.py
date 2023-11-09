from typing import Any, Dict, Generic, List, Tuple, TypeVar, Union

from pydantic import BaseModel

GeometryT = TypeVar("GeometryT")


# https://stevage.github.io/geojson-spec/#section-3.1
# https://www.mongodb.com/docs/manual/reference/geojson/
# https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
class PointGeometry(BaseModel):
    type: str = "Point"
    coordinates: Tuple[float, float]


class LineStringGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[Tuple[float, float]]


class PolygonGeometry(BaseModel):
    type: str = "Polygon"
    coordinates: Tuple[List[Tuple[float, float]]]


class AnyGeometry(BaseModel):
    type: str
    coordinates: Union[Tuple[float, float], List[List[float]]]


class GeoFeature(BaseModel, Generic[GeometryT]):
    type: str = "Feature"
    geometry: GeometryT
    properties: Dict[str, Any]


class PointsGeoJson(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoFeature[PointGeometry]]


class LinesGeoJson(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoFeature[LineStringGeometry]]


class PolygonsGeoJson(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoFeature[PolygonGeometry]]
