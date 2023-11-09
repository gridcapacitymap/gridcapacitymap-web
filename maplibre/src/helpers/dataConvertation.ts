import { IAnyGeojsonSource, ISomeObject } from './interfaces';
import { DataNode } from 'antd/es/tree';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestUnified,
  LinesGeoJson,
  PointsGeoJson,
} from '../client';
import { showMessage } from './message';

export const convertSelectedConnectionsToGeoSource = (
  selectedConnectionRequestsUnified: ConnectionRequestUnified[]
): IAnyGeojsonSource => ({
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: selectedConnectionRequestsUnified.map((connection) => {
      if (!connection.extra) {
        showMessage(
          'warning',
          `Connection request with id "${connection.id}" has no coordinates! Automatically set [0, 0]`
        );
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            connection.extra?.wsg84lon || 0,
            connection.extra?.wsg84lat || 0,
          ],
        },
        properties: connection,
      };
    }),
  },
});

export const propertiesToTreeData = (
  properties: ISomeObject,
  fullKey?: string
): DataNode[] => {
  return Object.keys(properties).map((key) => {
    if (typeof properties[key] === 'object' && properties[key] !== null) {
      return {
        title: key,
        key: fullKey ? `${fullKey}/${key}` : key,
        children: propertiesToTreeData(
          properties[key],
          fullKey ? `${fullKey}/${key}` : key
        ),
      };
    } else {
      return {
        title: `${key}: ${properties[key]}`,
        key: fullKey ? `${fullKey}/${key}` : key,
      };
    }
  });
};

export const COLOR_RED = 'rgb(247, 77, 77)';
export const COLOR_GREEN = 'rgb(56, 150, 42)';
export const DEFAULT_COLOR = 'rgb(110, 110, 110)'; // "DimGray", from default colors palate

export const addColorToBusesFeaturesProperties = (
  busesData: PointsGeoJson,
  headrooms: BusHeadroomSchema_Output[]
) => {
  const features = busesData.features.reduce(
    (features, feature) => {
      const headroom = headrooms.filter(
        (headroom) => headroom.bus.number == feature.properties.number
      );
      const busHasLimitingFactor = headroom.some(
        (x) => x?.load_lf || x?.gen_lf
      );
      const color =
        (headroom.length && (busHasLimitingFactor ? COLOR_RED : COLOR_GREEN)) ||
        DEFAULT_COLOR;

      return [
        ...features,
        {
          ...feature,
          properties: {
            ...feature.properties,
            color,
          },
        },
      ];
    },
    [] as PointsGeoJson['features']
  );

  return {
    type: 'FeatureCollection',
    features,
  };
};

export const addColorToBranchesFeaturesProperties = (
  branchesData: LinesGeoJson,
  headrooms: BusHeadroomSchema_Output[]
) => {
  const features = branchesData.features.reduce(
    (features, feature) => {
      const branchHasLimitingFactor = headrooms.filter(
        (headroom) =>
          (headroom.load_lf &&
            (headroom.load_lf.ss as unknown as Record<string, any>)
              ?.from_number == feature.properties.from_bus.number &&
            (headroom.load_lf.ss as unknown as Record<string, any>)
              ?.to_number == feature.properties.to_bus.number) ||
          (headroom.gen_lf &&
            (headroom.gen_lf.ss as unknown as Record<string, any>)
              ?.from_number == feature.properties.from_bus.number &&
            (headroom.gen_lf.ss as unknown as Record<string, any>)?.to_number ==
              feature.properties.to_bus.number)
      );
      const color =
        (headrooms.length &&
          (branchHasLimitingFactor.length ? COLOR_RED : COLOR_GREEN)) ||
        DEFAULT_COLOR;

      return [
        ...features,
        {
          ...feature,
          properties: {
            ...feature.properties,
            color,
          },
        },
      ];
    },
    [] as LinesGeoJson['features']
  );

  return {
    type: 'FeatureCollection',
    features,
  };
};

export const parseFeaturesProperties = (
  properties: Partial<Record<string, any>>
): Partial<Record<string, any>> => {
  return Object.keys(properties).reduce((parsedProperties, key) => {
    try {
      JSON.parse(properties[key]);
      return { ...parsedProperties, [key]: JSON.parse(properties[key]) };
    } catch {
      return { ...parsedProperties, [key]: properties[key] };
    }
  }, {});
};

export const convertScenarioConnectionRequestsToGeoSource = (
  connectionRequests: ConnectionRequestUnified[],
  busesGeoSource: IAnyGeojsonSource
): IAnyGeojsonSource => ({
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: connectionRequests.reduce(
      (features, sc) => {
        const connectivityNodeCoordinates = busesGeoSource.data.features.find(
          (b) => b.properties.number === sc.connectivity_node.id
        )?.geometry.coordinates;

        return connectivityNodeCoordinates
          ? [
              ...features,
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [sc.extra?.wsg84lon, sc.extra?.wsg84lat],
                    connectivityNodeCoordinates,
                  ],
                },
                properties: {},
              },
            ]
          : features;
      },
      [] as LinesGeoJson['features']
    ),
  },
});
