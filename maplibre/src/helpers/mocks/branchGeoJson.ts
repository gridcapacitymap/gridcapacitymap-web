export default {
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
      },
    },
  ],
};
