import { ConnectionRequestApiSchema } from '../client';
import { convertScenarioConnectionRequestsToGeoSource } from '../helpers/dataConverting';
import { IAnyGeojsonSource } from '../helpers/interfaces';

it('transforms connection requests to geojson', () => {
  const connections: ConnectionRequestApiSchema[] = [];
  const busGeoJson: IAnyGeojsonSource = {
    type: 'geojson',
    data: { features: [] },
  };
  const result = convertScenarioConnectionRequestsToGeoSource(
    connections,
    busGeoJson
  );
  expect(result).toMatchObject({
    data: { features: [], type: 'FeatureCollection' },
    type: 'geojson',
  });
});
