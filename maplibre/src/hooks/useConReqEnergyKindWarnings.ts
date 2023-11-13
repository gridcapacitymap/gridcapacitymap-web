import { useEffect, useState } from 'react';
import { ConnectionRequestApiSchema } from '../client';
import { showMessage } from '../helpers/message';
import { checkBusTypeSupportsConReqEnergyKind } from '../helpers/checkups';
import { IAnyGeojsonSource } from '../helpers/interfaces';

export type ConReqEnergyKindWarnings = Record<string, string>;

export const useConReqEnergyKindWarnings = (
  selectedConnectionRequests: ConnectionRequestApiSchema[],
  busesGeoSource: IAnyGeojsonSource,
  currentNetworkId: string | null
): ConReqEnergyKindWarnings => {
  const [conReqEnergyKindsWarnings, setConReqEnergyKindsWarnings] =
    useState<ConReqEnergyKindWarnings>({});

  useEffect(() => {
    if (!busesGeoSource) {
      setConReqEnergyKindsWarnings({});
      return;
    }

    setConReqEnergyKindsWarnings((prev) => ({
      ...prev,
      ...selectedConnectionRequests.reduce((newWarnings, sc) => {
        if (!Object.prototype.hasOwnProperty.call(prev, sc.id)) {
          const connectivityBus = busesGeoSource.data.features.find(
            (b) => b.properties.number == sc.connectivity_node.id
          );

          if (connectivityBus) {
            if (
              checkBusTypeSupportsConReqEnergyKind(
                connectivityBus.properties,
                sc
              )
            ) {
              return { ...newWarnings, [sc.id]: null };
            } else {
              const message = `${sc.project_id} has energy kind that is not supported by connectivity bus`;
              showMessage('error', message);
              newWarnings = { ...newWarnings, [sc.id]: message };
            }
          } else {
            showMessage(
              'error',
              `${sc.project_id}'s connectivity bus was not found`
            );
          }
        }
        return newWarnings;
      }, {}),
    }));
  }, [selectedConnectionRequests, busesGeoSource]);

  useEffect(() => {
    setConReqEnergyKindsWarnings({});
  }, [currentNetworkId]);

  return conReqEnergyKindsWarnings;
};
