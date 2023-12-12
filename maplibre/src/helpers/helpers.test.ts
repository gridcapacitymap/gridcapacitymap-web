import {
  convertSelectedConnectionsToGeoSource,
  propertiesToTreeData,
  addColorToBusesFeaturesProperties,
  addColorToBranchesFeaturesProperties,
  parseFeaturesProperties,
  convertScenarioConnectionRequestsToGeoSource,
} from './dataConverting';
import mockSelectedConnectionRequestUnified from './mocks/selectedConnectionRequests';
import busGeoJson from './mocks/busGeoJson';
import headrooms from './mocks/headrooms';
import mockBusTurnerGeoJson from './mocks/busTurnerGeoJson';
import branchGeoJson from './mocks/branchGeoJson';
import { ConnectionRequestApiSchema } from '../client';
import { IAnyGeojsonSource } from './interfaces';
import { getErrorMessageFromError } from './message';

describe('helpers testing', () => {
  describe('dataConverting file', () => {
    it('convertSelectedConnectionsToGeoSource should work', () => {
      const resultGeoJson = convertSelectedConnectionsToGeoSource(
        mockSelectedConnectionRequestUnified as ConnectionRequestApiSchema[]
      );

      expect(typeof resultGeoJson).toBe('object');
      expect(resultGeoJson).toHaveProperty('type');
      expect(resultGeoJson).toHaveProperty('data');
      expect(resultGeoJson.data).toHaveProperty('features');
      expect(resultGeoJson.data.features).toHaveLength(
        mockSelectedConnectionRequestUnified.length
      );
    });

    it('propertiesToTreeData should work', () => {
      const someObj = {
        fruits: ['an apple', 'a pear'],
        trees: {
          first: 'Apple',
          second: 'Pear',
        },
      };
      const result = propertiesToTreeData(someObj);

      expect(result).toMatchObject([
        {
          title: 'fruits',
          key: 'fruits',
          children: [
            { title: '0: an apple', key: 'fruits/0' },
            { title: '1: a pear', key: 'fruits/1' },
          ],
        },
        {
          title: 'trees',
          key: 'trees',
          children: [
            { title: 'first: Apple', key: 'trees/first' },
            { title: 'second: Pear', key: 'trees/second' },
          ],
        },
      ]);
    });

    it('addColorToBusesFeaturesProperties should work', () => {
      const result = addColorToBusesFeaturesProperties(busGeoJson, headrooms);

      expect(result).toMatchObject({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-1.208516598, 51.667434692],
            },
            properties: {
              id: '1691c892-2f50-453f-b7e2-ab2a8486673d',
              number: 'CabinCrk',
              name: 'CabinCrk',
              bus_type: 1,
              base_kv: 132.0,
              voltage_pu: 1.0,
              area_name: null,
              area_number: null,
              zone_name: '',
              zone_number: null,
              actual_load_mva: [0.0, 0.0],
              actual_gen_mva: [0.0, 0.0],
              net_id: '5b3ed0c7-20d3-45fe-8c3b-84acb64750d3',
              color: 'rgb(56, 150, 42)',
            },
          },
        ],
      });
    });

    it('addColorToBranchesFeaturesProperties should work', () => {
      const result = addColorToBranchesFeaturesProperties(
        branchGeoJson,
        headrooms
      );

      expect(result).toMatchObject({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [-2.576314449, 51.489929199],
                [-2.272620201, 51.545593262],
                [-1.981258273, 51.598930359],
                [-1.555615425, 51.587665558],
                [-1.208516598, 51.667434692],
              ],
            },
            properties: {
              id: 'e47ce23e-0bef-4cb2-8122-16d1a8050f95',
              from_bus_id: '1691c892-2f50-453f-b7e2-ab2a8486673d',
              to_bus_id: '89510b03-91b6-46ab-877a-cff894832642',
              branch_id: '1.0',
              in_service: true,
              from_bus: {
                id: '1691c892-2f50-453f-b7e2-ab2a8486673d',
                number: 'CabinCrk',
                name: 'CabinCrk',
              },
              to_bus: {
                id: '89510b03-91b6-46ab-877a-cff894832642',
                number: 'Bradley',
                name: 'Bradley',
              },
              color: 'rgb(56, 150, 42)',
            },
          },
        ],
      });
    });

    it('parseFeaturesProperties should work', () => {
      const result = parseFeaturesProperties({
        fruits: '{"apple": "sun"}',
      });

      expect(result).toMatchObject({
        fruits: {
          apple: 'sun',
        },
      });
    });

    it('convertScenarioConnectionRequestsToGeoSource should work', () => {
      const result = convertScenarioConnectionRequestsToGeoSource(
        mockSelectedConnectionRequestUnified as ConnectionRequestApiSchema[],
        mockBusTurnerGeoJson as IAnyGeojsonSource
      );

      expect(result).toMatchObject({
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-2.127803153144379, 51.94223770356756],
                  [-2.25221777, 51.949337006],
                ],
              },
              properties: {},
            },
          ],
        },
      });
    });

    it('getErrorMessageFromError should work', () => {
      let result = getErrorMessageFromError({ message: 'test' });
      expect(result).toBe('test');

      result = getErrorMessageFromError({ response: { message: 'test' } });
      expect(result).toBe('test');

      result = getErrorMessageFromError({
        response: { data: { message: 'test' } },
      });
      expect(result).toBe('test');

      result = getErrorMessageFromError({});
      expect(result).toBe('Unknown error');
    });
  });
});
