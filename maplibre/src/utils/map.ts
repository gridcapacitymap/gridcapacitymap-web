import { FitBoundsOptions, LngLatLike, Map } from 'maplibre-gl';
import { LinesGeoJson, PointsGeoJson, PolygonsGeoJson } from '../client';
import { IAnyGeojsonSource } from '../types/map';

export const zoomToCoordinates = (
  map: Map | null,
  coordinates: LngLatLike[],
  options: FitBoundsOptions = {}
) => {
  if (
    map &&
    coordinates.length &&
    !coordinates
      .map((c) => Object.values(c))
      .flat()
      .some((c) => isNaN(parseInt(c)))
  ) {
    const startCoordinates: [number, number, number, number] = [
      Object.values(coordinates[0])[0],
      Object.values(coordinates[0])[1],
      Object.values(coordinates[0])[0],
      Object.values(coordinates[0])[1],
    ];

    const oppositeCoordinates = coordinates.reduce(
      (lngLatBounds: [number, number, number, number], lngLat: LngLatLike) => {
        return [
          Math.min(lngLatBounds[0], Object.values(lngLat)[0]),
          Math.max(lngLatBounds[1], Object.values(lngLat)[1]),
          Math.max(lngLatBounds[2], Object.values(lngLat)[0]),
          Math.min(lngLatBounds[3], Object.values(lngLat)[1]),
        ];
      },
      startCoordinates as [number, number, number, number]
    );

    map.fitBounds(oppositeCoordinates, {
      maxZoom: 16,
      padding: 20,
      duration: 1000,
      ...options,
    });
  }
};

const emptySourceData = {
  type: 'FeatureCollection',
  features: [],
};

export const emptyLinesSourceData: LinesGeoJson = emptySourceData;
export const emptyPointSourceData: PointsGeoJson = emptySourceData;
export const emptyPolygonsSourceData: PolygonsGeoJson = emptySourceData;

export const emptySource: IAnyGeojsonSource = {
  type: 'geojson',
  data: emptySourceData,
};
