import {
  FC,
  createContext,
  useState,
  PropsWithChildren,
  useEffect,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { IAnyGeojsonSource, SourcesIdsEnum } from '../types/map';

import { ConnectionWarnings } from '../types';

import { IPickedElement } from '../types/pickedCard';
import { SetState } from '../types';
import {
  addColorToBranchesFeaturesProperties,
  addColorToBusesFeaturesProperties,
  convertScenarioConnectionRequestsToGeoSource,
  convertSelectedConnectionsToGeoSource,
} from '../utils/dataConverting';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestApiSchema,
  ConnectionsService,
  LinesGeoJson,
  NetworksService,
  PointsGeoJson,
  ScenarioDetailsApiSchema,
  ScenariosService,
  SerializedNetwork,
} from '../client';
import { showMessage } from '../utils/message';
import { emptySource } from '../utils/map';
import { Map } from 'maplibre-gl';
import { useConnectionWarnings } from '../hooks/useConnectionWarnings';
import { useQuery } from '@tanstack/react-query';
import {
  emptyLinesSourceData,
  emptyPointSourceData,
  emptyPolygonsSourceData,
  zoomToCoordinates,
} from '../utils/map';

export interface IMainContext {
  map: Map | null;
  currentNetworkId: string | null;
  networks: SerializedNetwork[];
  currentScenarioId: string | null;
  currentScenarioDetails: ScenarioDetailsApiSchema | null;
  createdScenariosIds: string[];
  headroom: BusHeadroomSchema_Output[];
  selectedConnectionRequests: ConnectionRequestApiSchema[];
  currentScenarioConnectionRequests: ConnectionRequestApiSchema[];
  branchesGeojson: LinesGeoJson;
  trafoBranchesGeojson: LinesGeoJson;
  busesGeojson: PointsGeoJson;
  pickedElement: IPickedElement | null;
  connectionRequestWarnings: Record<string, ConnectionWarnings>;
  setMap: SetState<Map | null>;
  setCurrentNetworkId: SetState<string | null>;
  setCurrentScenarioId: SetState<string | null>;
  setCreatedScenariosIds: SetState<string[]>;
  setSelectedConnectionRequests: SetState<ConnectionRequestApiSchema[]>;
  setPickedElement: SetState<IPickedElement | null>;
  setPickedHexagonId: SetState<string>;
}

export const MainContext = createContext<IMainContext | null>(null);

export const MainContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [map, setMap] = useState<Map | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentNetworkId, setCurrentNetworkId] = useState<string | null>(
    searchParams.get('netId') || import.meta.env.VITE_DEFAULT_NETWORK_ID || null
  );
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(
    null
  );
  const [createdScenariosIds, setCreatedScenariosIds] = useState<string[]>([]);
  const [headroom, setHeadroom] = useState<BusHeadroomSchema_Output[]>([]);

  const [selectedConnectionRequests, setSelectedConnectionRequests] = useState<
    ConnectionRequestApiSchema[]
  >([]);
  const [
    currentScenarioConnectionRequests,
    setCurrentScenarioConnectionRequests,
  ] = useState<ConnectionRequestApiSchema[]>([]);
  const [prevScenarioConnectionRequests, setPrevScenarioConnectionRequests] =
    useState<ConnectionRequestApiSchema[]>([]);

  const [connectionRequestGeoSource, setConnectionRequestGeoSource] =
    useState<IAnyGeojsonSource>(emptySource);
  const [
    scenarioConnectionsLinesGeoSource,
    setScenarioConnectionsLinesGeoSource,
  ] = useState<IAnyGeojsonSource>(emptySource);
  const [pickedElement, setPickedElement] = useState<IPickedElement | null>(
    null
  );

  const [pickedHexagonId, setPickedHexagonId] = useState<string>('');

  const [hexagonsConnectionRequests, setHexagonsConnectionRequests] = useState<
    Record<string, ConnectionRequestApiSchema[]>
  >({});

  const { data: networks = [] } = useQuery({
    queryKey: ['networks'],
    queryFn: async () => await NetworksService.listNetworks(),
    throwOnError: (err) => {
      showMessage('error', err);
      return false;
    },
  });

  useEffect(() => {
    if (networks.length && currentNetworkId) {
      setCurrentScenarioId(
        networks.find((n) => n.id === currentNetworkId)?.default_scenario_id ||
          null
      );
    }
  }, [networks, currentNetworkId]);

  const { data: currentScenarioDetails = null } = useQuery({
    queryKey: ['currentScenarioDetails', currentScenarioId, currentNetworkId],
    queryFn: async () => {
      if (currentNetworkId && currentScenarioId) {
        return await ScenariosService.getScenarioDetails({
          netId: currentNetworkId as string,
          scenarioId: currentScenarioId,
        });
      }
      return null;
    },
    throwOnError: (err) => {
      showMessage('error', err);
      return false;
    },
  });

  useEffect(() => {
    if (currentScenarioDetails) {
      setHeadroom(currentScenarioDetails.headroom || []);
      setCurrentScenarioConnectionRequests((prev) => {
        setPrevScenarioConnectionRequests(prev);
        return currentScenarioDetails.connection_requests_list || [];
      });
    }
  }, [currentScenarioDetails]);

  const { data: branchesGeojson = emptyLinesSourceData } = useQuery({
    queryKey: ['branchesGeojson', currentNetworkId],
    queryFn: async () => {
      if (currentNetworkId) {
        return await NetworksService.branchesGeojson({
          netId: currentNetworkId,
        });
      }
    },
  });

  const { data: trafoBranchesGeojson = emptyLinesSourceData } = useQuery({
    queryKey: ['trafoBranchesGeojson', currentNetworkId],
    queryFn: async () => {
      if (currentNetworkId) {
        return await NetworksService.trafosGeojson({
          netId: currentNetworkId,
        });
      }
    },
  });

  const { data: busesGeojson = emptyPointSourceData } = useQuery({
    queryKey: ['busesGeojson', currentNetworkId],
    queryFn: async () => {
      if (currentNetworkId) {
        return await NetworksService.busesGeojson({
          netId: currentNetworkId,
        });
      }
    },
  });

  const { data: connectionRequestsDensityGeojson = emptyPolygonsSourceData } =
    useQuery({
      queryKey: ['connectionRequestsDensityGeojson', currentNetworkId],
      queryFn: async () => {
        if (currentNetworkId) {
          return await ConnectionsService.getConnectionRequestsDensityGeojson({
            netId: currentNetworkId,
          });
        }
      },
    });

  const connectionRequestWarnings = useConnectionWarnings(
    selectedConnectionRequests,
    headroom,
    currentScenarioConnectionRequests,
    busesGeojson
  );

  useEffect(() => {
    setSelectedConnectionRequests((prevSelectedConnections) => {
      return [
        ...prevSelectedConnections.filter(
          (c) =>
            !prevScenarioConnectionRequests.some((sc) => sc.id === c.id) &&
            !currentScenarioConnectionRequests.some((sc) => sc.id === c.id)
        ),
        ...currentScenarioConnectionRequests,
      ];
    });

    setScenarioConnectionsLinesGeoSource(
      convertScenarioConnectionRequestsToGeoSource(
        currentScenarioConnectionRequests,
        busesGeojson
      )
    );
  }, [currentScenarioConnectionRequests]);

  useEffect(() => {
    setCurrentNetworkId(searchParams.get('netId'));
  }, [searchParams]);

  useEffect(() => {
    if (currentNetworkId) {
      if (currentNetworkId !== searchParams.get('netId')) {
        setSearchParams({ netId: currentNetworkId });
      }

      setSelectedConnectionRequests([]);
      // TODO: how to set cash in react query?
      // setCurrentScenarioDetails(null);
      setPickedElement(null);
      setHexagonsConnectionRequests({});
    }
  }, [currentNetworkId]);

  useEffect(() => {
    const coordinates = networks.find((net) => net.id === currentNetworkId)
      ?.geom?.coordinates[0];
    if (currentNetworkId && map && coordinates) {
      zoomToCoordinates(map, [coordinates[0], coordinates[2]]);
    }
  }, [currentNetworkId, networks, map]);

  // map.getSource() returns type without .setData() property but it used in documentation
  // https://maplibre.org/maplibre-gl-js-docs/api/sources/#geojsonsource#setdata
  useEffect(() => {
    (map?.getSource(SourcesIdsEnum.connectionRequestsSourceId) as any)?.setData(
      connectionRequestGeoSource.data
    );
  }, [map, connectionRequestGeoSource]);

  useEffect(() => {
    (
      map?.getSource(SourcesIdsEnum.scenarioConnectionsLinesSourceId) as any
    )?.setData(scenarioConnectionsLinesGeoSource.data);
  }, [map, scenarioConnectionsLinesGeoSource]);

  useEffect(() => {
    (map?.getSource(SourcesIdsEnum.branchesSourceId) as any)?.setData(
      addColorToBranchesFeaturesProperties(branchesGeojson, headroom)
    );
  }, [map, branchesGeojson, headroom]);

  useEffect(() => {
    (map?.getSource(SourcesIdsEnum.trafosSourceId) as any)?.setData(
      addColorToBranchesFeaturesProperties(trafoBranchesGeojson, headroom)
    );
  }, [map, trafoBranchesGeojson, headroom]);

  useEffect(() => {
    (map?.getSource(SourcesIdsEnum.busesSourceId) as any)?.setData(
      addColorToBusesFeaturesProperties(busesGeojson, headroom)
    );
  }, [map, busesGeojson, headroom]);

  useEffect(() => {
    setConnectionRequestGeoSource(
      convertSelectedConnectionsToGeoSource(selectedConnectionRequests)
    );
  }, [selectedConnectionRequests]);

  useEffect(() => {
    (map?.getSource(SourcesIdsEnum.connectionRequestsDensity) as any)?.setData(
      connectionRequestsDensityGeojson
    );
  }, [map, connectionRequestsDensityGeojson]);

  useEffect(() => {
    if (pickedHexagonId && currentNetworkId) {
      ConnectionsService.getConnectionRequests({
        netId: currentNetworkId,
        limit: 9999,
        h3Id: pickedHexagonId,
      })
        .then((res) => {
          setHexagonsConnectionRequests((prev) => ({
            ...prev,
            [pickedHexagonId]: res.items,
          }));
        })
        .catch((e) => showMessage('error', e));
    }
  }, [pickedHexagonId]);

  useEffect(() => {
    (map?.getSource(SourcesIdsEnum.hexagonsConnectionRequest) as any)?.setData(
      convertSelectedConnectionsToGeoSource(
        Object.values(hexagonsConnectionRequests)
          .flat()
          .filter(
            ({ id }) => !selectedConnectionRequests.some((c) => c.id === id)
          )
      ).data
    );
  }, [map, hexagonsConnectionRequests, selectedConnectionRequests]);

  const value: IMainContext = {
    map,
    currentNetworkId,
    networks,
    currentScenarioId,
    currentScenarioDetails,
    createdScenariosIds,
    headroom,
    selectedConnectionRequests,
    currentScenarioConnectionRequests,
    branchesGeojson,
    trafoBranchesGeojson,
    busesGeojson,
    pickedElement,
    connectionRequestWarnings,
    setMap,
    setCurrentNetworkId,
    setCurrentScenarioId,
    setCreatedScenariosIds,
    setSelectedConnectionRequests,
    setPickedElement,
    setPickedHexagonId: setPickedHexagonId,
  };

  return <MainContext.Provider value={value}>{children}</MainContext.Provider>;
};
