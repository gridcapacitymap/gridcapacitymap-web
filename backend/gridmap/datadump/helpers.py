import logging
import math
import random
import sys
from math import atan2, cos, radians, sin, sqrt
from typing import Dict, List, Tuple, Union

from sweref99 import projections

from ..networks.models import Bus
from ..schemas.geo import PointGeometry

tm = projections.make_transverse_mercator("SWEREF_99_TM")

logger = logging.getLogger(__name__)


EARTH_RADIUS = 6371000  # meters
DEG_TO_RAD = math.pi / 180.0
THREE_PI = math.pi * 3
TWO_PI = math.pi * 2


def to_radians(val: Tuple[float, float]):
    return val[0] * DEG_TO_RAD, val[1] * DEG_TO_RAD


def to_degrees(val: Tuple[float, float]):
    return val[0] / DEG_TO_RAD, val[1] / DEG_TO_RAD


def point_at_distance(seed: Tuple[float, float], distance: int):
    lon, lat = to_radians(seed)
    sin_lat = math.sin(lat)
    cos_lat = math.cos(lat)

    bearing = random.random() * TWO_PI
    theta = distance / EARTH_RADIUS
    sin_bearing = math.sin(bearing)
    cos_bearing = math.cos(bearing)
    sin_theta = math.sin(theta)
    cos_theta = math.cos(theta)

    res_lat = math.asin(sin_lat * cos_theta + cos_lat * sin_theta * cos_bearing)
    res_lon = lon + math.atan2(
        sin_bearing * sin_theta * cos_lat, cos_theta - sin_lat * math.sin(res_lat)
    )
    res_lon = ((res_lon + THREE_PI) % TWO_PI) - math.pi

    return to_degrees((res_lon, res_lat))


def point_in_circle(coord: Tuple[float, float], distance: int):
    """
    Creates random point within given distance from seed coordinates

    :param tuple center: wsg84 coords of seed point (lon, lat)
    :param int radius: max distance from seed point in meters
    :return: wsg84 point coordinate (lon, lat)
    :rtype: tuple
    """
    rnd = random.random()
    random_dist = round(math.pow(rnd, 0.5) * distance)
    return point_at_distance(coord, random_dist)


# measure distance between two points in meters
# https://stackoverflow.com/a/19412565
def get_distance(latlon1: Tuple[float, float], latlon2: Tuple[float, float]):
    if not latlon1 or not latlon2:
        return sys.maxsize

    lat1, lon1 = radians(latlon1[0]), radians(latlon1[1])
    lat2, lon2 = radians(latlon2[0]), radians(latlon2[1])
    # lat1 = radians(59.305826)
    # lon1 = radians(18.027708)

    # lat2 = radians(64.1339512)
    # lon2 = radians(-21.913768)

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = EARTH_RADIUS * c
    return distance


def mock_connection_coords(
    buses: List[Bus],
    distance_meters,
    coords: Dict[str, Union[int, float]],
    conn_node_id: str,
    *args,
):
    n, e, rlat, rlon = None, None, None, None

    bus = next((x for x in buses if x.number == conn_node_id), None)

    i = 0
    while not bus or not bus.geom and i < len(buses):
        bus = random.choice(buses)
        i += 1

    if not bus.geom:
        raise ValueError(f"Bus number '{conn_node_id}' has no geometry")

    g = PointGeometry.parse_raw(bus.geom)  # type: ignore
    lon, lat = g.coordinates

    if type(lon) is float and type(lat) is float:
        rlon, rlat = point_in_circle((lon, lat), distance_meters)
        n, e = tm.geodetic_to_grid(lat, lon)

    return {
        "sweref99tmNorthing": n,
        "sweref99tmEasting": e,
        "wsg84lat": rlat,
        "wsg84lon": rlon,
    }
