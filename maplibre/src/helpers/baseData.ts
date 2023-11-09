import { IAnyGeojsonSource } from './interfaces';

export const emptySource: IAnyGeojsonSource = {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [],
  },
};
