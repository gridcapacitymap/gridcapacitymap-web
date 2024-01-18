import { useEffect, useState } from 'react';
import { checkConnectionRequestForWarnings } from '../helpers/checkups';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestApiSchema,
  PointsGeoJson,
} from '../client';
import { ConnectionWarnings } from '../helpers/interfaces';

export const useConnectionWarnings = (
  selectedConnectionRequests: ConnectionRequestApiSchema[],
  headrooms: BusHeadroomSchema_Output[],
  currentScenarioConnectionRequests: ConnectionRequestApiSchema[],
  busesGeojson: PointsGeoJson
): Record<string, ConnectionWarnings> => {
  const [warnings, setWarnings] = useState<Record<string, ConnectionWarnings>>(
    {}
  );

  useEffect(() => {
    const newWarnings: Record<string, ConnectionWarnings> = {};
    selectedConnectionRequests
      .filter(
        (selectedC) =>
          !currentScenarioConnectionRequests.some(
            (scenarioC) => scenarioC.id === selectedC.id
          )
      )
      .forEach((c) => {
        const connectivityBusHeadroom = headrooms.find(
          (h) => h.bus.number == c.connectivity_node.id
        );
        const connectivityBusProperties = busesGeojson.features.find(
          (b) => b.properties.number === c.connectivity_node.id
        )?.properties;

        newWarnings[c.id] = checkConnectionRequestForWarnings(
          c,
          connectivityBusHeadroom,
          connectivityBusProperties,
          warnings
        );
      });

    setWarnings(newWarnings);
  }, [
    selectedConnectionRequests,
    headrooms,
    currentScenarioConnectionRequests,
  ]);

  return warnings;
};
