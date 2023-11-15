import { useEffect, useState } from 'react';
import { checkConnectionRequestForWarnings } from '../helpers/checkups';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestApiSchema,
} from '../client';
import { ConnectionWarnings, IAnyGeojsonSource } from '../helpers/interfaces';

export const useConnectionWarnings = (
  selectedConnectionRequestsUnified: ConnectionRequestApiSchema[],
  headrooms: BusHeadroomSchema_Output[],
  currentScenarioConnectionRequestsUnified: ConnectionRequestApiSchema[],
  busesGeoSource: IAnyGeojsonSource
): Record<string, ConnectionWarnings> => {
  const [warnings, setWarnings] = useState<Record<string, ConnectionWarnings>>(
    {}
  );

  useEffect(() => {
    const newWarnings: Record<string, ConnectionWarnings> = {};
    selectedConnectionRequestsUnified
      .filter(
        (selectedC) =>
          !currentScenarioConnectionRequestsUnified.some(
            (scenarioC) => scenarioC.id === selectedC.id
          )
      )
      .forEach((c) => {
        const connectivityBusHeadroom = headrooms.find(
          (h) => h.bus.number == c.connectivity_node.id
        );
        const connectivityBusProperties = busesGeoSource.data.features.find(
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
    selectedConnectionRequestsUnified,
    headrooms,
    currentScenarioConnectionRequestsUnified,
  ]);

  return warnings;
};
