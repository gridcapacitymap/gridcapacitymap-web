import {
  FC,
  createContext,
  useState,
  PropsWithChildren,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  ConnectionWarnings,
  IAnyGeojsonSource,
  IPickedElement,
  ISourcesIdsEnum,
  SetState,
} from '../helpers/interfaces';
import {
  addColorToBranchesFeaturesProperties,
  addColorToBusesFeaturesProperties,
  convertScenarioConnectionRequestsToGeoSource,
  convertSelectedConnectionsToGeoSource,
} from '../helpers/dataConverting';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestApiSchema,
  ConnectionsService,
  NetworksService,
  ScenarioDetailsApiSchema,
  ScenariosService,
  SerializedNetwork,
} from '../client';
import { showMessage } from '../helpers/message';
import { emptySource } from '../helpers/baseData';
import { FitBoundsOptions, LngLatLike, Map } from 'maplibre-gl';
import { useConnectionWarnings } from '../hooks/useConnectionWarnings';

export interface IMainContext {
  map: Map | null;
  currentNetworkId: string | null;
  networks: SerializedNetwork[];
  currentScenarioId: string | null;
  currentScenarioDetails: ScenarioDetailsApiSchema | null;
  createdScenariosIds: string[];
  headroom: BusHeadroomSchema_Output[];
  selectedConnectionRequestsUnified: ConnectionRequestApiSchema[];
  currentScenarioConnectionRequestsUnified: ConnectionRequestApiSchema[];
  prevScenarioConnectionRequestsUnified: ConnectionRequestApiSchema[];
  connectionRequestGeoSource: IAnyGeojsonSource;
  branchesGeoSource: IAnyGeojsonSource;
  trafoBranchesGeoSource: IAnyGeojsonSource;
  busesGeoSource: IAnyGeojsonSource;
  pickedElement: IPickedElement | null;
  connectionRequestWarnings: Record<string, ConnectionWarnings>;
  pickedHexagonCoordinates: [number, number][];
  setMap: SetState<Map | null>;
  setCurrentNetworkId: (netId: string) => void;
  setNetworks: SetState<SerializedNetwork[]>;
  setCurrentScenarioId: SetState<string | null>;
  setCurrentScenarioDetails: SetState<ScenarioDetailsApiSchema | null>;
  setCreatedScenariosIds: SetState<string[]>;
  setHeadroom: SetState<BusHeadroomSchema_Output[]>;
  setSelectedConnectionRequestsUnified: SetState<ConnectionRequestApiSchema[]>;
  setConnectionRequestGeoSource: SetState<IAnyGeojsonSource>;
  setBranchesGeoSource: SetState<IAnyGeojsonSource>;
  setTrafoBranchesGeoSource: SetState<IAnyGeojsonSource>;
  setBusesGeoSource: SetState<IAnyGeojsonSource>;
  setPickedElement: SetState<IPickedElement | null>;
  setPickedHexagonCoordinates: SetState<[number, number][]>;
  zoomToCoordinates: (coordinates: LngLatLike[]) => void;

  connectionsDensitySource: IAnyGeojsonSource;
  setConnectionsDensitySource: SetState<IAnyGeojsonSource>;
}

// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/24509#issuecomment-382213106
export const MainContext = createContext<IMainContext | null>(null);

export const MainContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [map, setMap] = useState<Map | null>(null);
  const [currentNetworkId, setStateCurrentNetworkId] = useState<string | null>(
    searchParams.get('netId') || import.meta.env.VITE_DEFAULT_NETWORK_ID || null
  );
  const setCurrentNetworkId = (netId: string | null): void => {
    currentNetworkId !== netId && setStateCurrentNetworkId(netId);
  };
  const [lastNetworkId, setLastNetworkId] = useState<string | null>(null);
  const [networks, setNetworks] = useState<SerializedNetwork[]>([]);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(
    null
  );
  const [currentScenarioDetails, setCurrentScenarioDetails] =
    useState<ScenarioDetailsApiSchema | null>(null);
  const [createdScenariosIds, setCreatedScenariosIds] = useState<string[]>([]);
  const [headroom, setHeadroom] = useState<BusHeadroomSchema_Output[]>([]);

  const [
    selectedConnectionRequestsUnified,
    setSelectedConnectionRequestsUnified,
  ] = useState<ConnectionRequestApiSchema[]>([]);
  const [
    currentScenarioConnectionRequestsUnified,
    setCurrentScenarioConnectionRequestsUnified,
  ] = useState<ConnectionRequestApiSchema[]>([]);
  const [
    prevScenarioConnectionRequestsUnified,
    setPrevScenarioConnectionRequestsUnified,
  ] = useState<ConnectionRequestApiSchema[]>([]);

  const [connectionRequestGeoSource, setConnectionRequestGeoSource] =
    useState<IAnyGeojsonSource>(emptySource);
  const [
    scenarioConnectionsLinesGeoSource,
    setScenarioConnectionsLinesGeoSource,
  ] = useState<IAnyGeojsonSource>(emptySource);
  const [branchesGeoSource, setBranchesGeoSource] =
    useState<IAnyGeojsonSource>(emptySource);
  const [trafoBranchesGeoSource, setTrafoBranchesGeoSource] =
    useState<IAnyGeojsonSource>(emptySource);
  const [busesGeoSource, setBusesGeoSource] =
    useState<IAnyGeojsonSource>(emptySource);

  const [pickedElement, setPickedElement] = useState<IPickedElement | null>(
    null
  );

  const [pickedHexagonCoordinates, setPickedHexagonCoordinates] = useState<
    [number, number][]
  >([]);
  const [hexagonsConnectionRequests, setHexagonsConnectionRequests] = useState<
    Record<string, ConnectionRequestApiSchema[]>
  >({});

  const connectionRequestWarnings = useConnectionWarnings(
    selectedConnectionRequestsUnified,
    headroom,
    currentScenarioConnectionRequestsUnified,
    busesGeoSource
  );

  const zoomToCoordinates = useMemo(() => {
    return (coordinates: LngLatLike[], options: FitBoundsOptions = {}) => {
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
          (
            lngLatBounds: [number, number, number, number],
            lngLat: LngLatLike
          ) => {
            return [
              Math.min(lngLatBounds[0], Object.values(lngLat)[0]),
              Math.max(lngLatBounds[1], Object.values(lngLat)[1]),
              Math.max(lngLatBounds[2], Object.values(lngLat)[0]),
              Math.min(lngLatBounds[3], Object.values(lngLat)[1]),
            ];
          },
          startCoordinates as [number, number, number, number]
        );

        map?.fitBounds(oppositeCoordinates, {
          maxZoom: 16,
          padding: 80,
          duration: 1000,
          ...options,
        });
      }
    };
  }, [map]);

  const [connectionsDensitySource, setConnectionsDensitySource] =
    useState<IAnyGeojsonSource>(emptySource);

  useEffect(() => {
    NetworksService.listNetworks()
      .then((res) => setNetworks(res))
      .catch((e) => showMessage('error', e));
  }, []);

  useEffect(() => {
    if (networks.length && currentNetworkId) {
      setCurrentScenarioId(
        networks.find((n) => n.id === currentNetworkId)?.default_scenario_id ||
          null
      );
    }
  }, [networks, currentNetworkId]);

  useEffect(() => {
    if (currentScenarioId) {
      ScenariosService.getScenarioDetails({
        netId: currentNetworkId as string,
        scenarioId: currentScenarioId,
      })
        .then((res) => setCurrentScenarioDetails(res))
        .catch((e) => showMessage('error', e));
    } else {
      setCurrentScenarioDetails(null);
    }
  }, [currentScenarioId]);

  useEffect(() => {
    if (currentScenarioDetails) {
      setHeadroom(currentScenarioDetails.headroom || []);
      setCurrentScenarioConnectionRequestsUnified((prev) => {
        setPrevScenarioConnectionRequestsUnified(prev);
        return currentScenarioDetails.connection_requests_list || [];
      });
    }
  }, [currentScenarioDetails]);

  useEffect(() => {
    setSelectedConnectionRequestsUnified((prevSelectedConnections) => {
      return [
        ...prevSelectedConnections.filter(
          (c) =>
            !prevScenarioConnectionRequestsUnified.some((sc) => sc.id === c.id)
        ),
        ...currentScenarioConnectionRequestsUnified,
      ];
    });

    setScenarioConnectionsLinesGeoSource(
      convertScenarioConnectionRequestsToGeoSource(
        currentScenarioConnectionRequestsUnified,
        busesGeoSource
      )
    );
  }, [currentScenarioConnectionRequestsUnified]);

  useEffect(() => {
    if (currentNetworkId !== searchParams.get('netId')) {
      setCurrentNetworkId(searchParams.get('netId'));
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentNetworkId && currentNetworkId !== lastNetworkId) {
      setLastNetworkId(currentNetworkId);
      if (currentNetworkId !== searchParams.get('netId')) {
        setSearchParams({ netId: currentNetworkId });
      }

      setSelectedConnectionRequestsUnified([]);
      setCurrentScenarioDetails(null);
      setPickedElement(null);
      setHexagonsConnectionRequests({});

      NetworksService.busesGeojson({ netId: currentNetworkId })
        .then((res) =>
          setBusesGeoSource({
            type: 'geojson',
            data: res,
          })
        )
        .catch((e) => showMessage('error', e));

      NetworksService.branchesGeojson({ netId: currentNetworkId })
        .then((res) =>
          setBranchesGeoSource({
            type: 'geojson',
            data: res,
          })
        )
        .catch((e) => showMessage('error', e));

      NetworksService.trafosGeojson({ netId: currentNetworkId })
        .then((res) =>
          setTrafoBranchesGeoSource({
            type: 'geojson',
            data: res,
          })
        )
        .catch((e) => showMessage('error', e));

      ConnectionsService.getConnectionRequestsDensityGeojson({
        netId: currentNetworkId,
      })
        .then((data) => setConnectionsDensitySource({ type: 'geojson', data }))
        .catch((e) => showMessage('error', e));
    }
  }, [currentNetworkId]);

  useEffect(() => {
    const coordinates = networks.find((net) => net.id === currentNetworkId)
      ?.geom?.coordinates[0];
    if (currentNetworkId && map && coordinates) {
      zoomToCoordinates([coordinates[0], coordinates[2]]);
    }
  }, [currentNetworkId, map]);

  // map.getSource() returns type without .setData() property but it used in documentation
  // https://maplibre.org/maplibre-gl-js-docs/api/sources/#geojsonsource#setdata
  useEffect(() => {
    (
      map?.getSource(ISourcesIdsEnum.connectionRequestsSourceId) as any
    )?.setData(connectionRequestGeoSource.data);
  }, [map, connectionRequestGeoSource]);

  useEffect(() => {
    (
      map?.getSource(ISourcesIdsEnum.scenarioConnectionsLinesSourceId) as any
    )?.setData(scenarioConnectionsLinesGeoSource.data);
  }, [map, scenarioConnectionsLinesGeoSource]);

  useEffect(() => {
    (map?.getSource(ISourcesIdsEnum.branchesSourceId) as any)?.setData(
      addColorToBranchesFeaturesProperties(branchesGeoSource.data, headroom)
    );
  }, [map, branchesGeoSource, headroom]);

  useEffect(() => {
    (map?.getSource(ISourcesIdsEnum.trafosSourceId) as any)?.setData(
      addColorToBranchesFeaturesProperties(
        trafoBranchesGeoSource.data,
        headroom
      )
    );
  }, [map, trafoBranchesGeoSource, headroom]);

  useEffect(() => {
    (map?.getSource(ISourcesIdsEnum.busesSourceId) as any)?.setData(
      addColorToBusesFeaturesProperties(busesGeoSource.data, headroom)
    );
  }, [map, busesGeoSource, headroom]);

  useEffect(() => {
    setConnectionRequestGeoSource(
      convertSelectedConnectionsToGeoSource(selectedConnectionRequestsUnified)
    );
  }, [selectedConnectionRequestsUnified]);

  useEffect(() => {
    (map?.getSource(ISourcesIdsEnum.connectionRequestsDensity) as any)?.setData(
      connectionsDensitySource.data
    );
  }, [map, connectionsDensitySource]);

  useEffect(() => {
    if (pickedHexagonCoordinates.length && currentNetworkId) {
      ConnectionsService.getConnectionRequests({
        netId: currentNetworkId,
        limit: 9999,
        area: pickedHexagonCoordinates.map((c) => c.join(',')),
      })
        .then((res) => {
          setHexagonsConnectionRequests((prev) => ({
            ...prev,
            [pickedHexagonCoordinates.flat().join(',')]: res.items,
          }));
        })
        .catch((e) => showMessage('error', e));
    }
  }, [pickedHexagonCoordinates]);

  useEffect(() => {
    (map?.getSource(ISourcesIdsEnum.hexagonsConnectionRequest) as any)?.setData(
      convertSelectedConnectionsToGeoSource(
        Object.values(hexagonsConnectionRequests)
          .flat()
          .filter(
            ({ id }) =>
              !selectedConnectionRequestsUnified.some((c) => c.id === id)
          )
      ).data
    );
  }, [map, hexagonsConnectionRequests, selectedConnectionRequestsUnified]);

  const value: IMainContext = {
    map,
    currentNetworkId,
    networks,
    currentScenarioId,
    currentScenarioDetails,
    createdScenariosIds,
    headroom,
    selectedConnectionRequestsUnified,
    currentScenarioConnectionRequestsUnified,
    prevScenarioConnectionRequestsUnified,
    connectionRequestGeoSource,
    branchesGeoSource,
    trafoBranchesGeoSource,
    busesGeoSource,
    pickedElement,
    connectionRequestWarnings,
    pickedHexagonCoordinates,
    setMap,
    setCurrentNetworkId,
    setNetworks,
    setCurrentScenarioId,
    setCurrentScenarioDetails,
    setCreatedScenariosIds,
    setHeadroom,
    setSelectedConnectionRequestsUnified,
    setConnectionRequestGeoSource,
    setBranchesGeoSource,
    setTrafoBranchesGeoSource,
    setBusesGeoSource,
    setPickedElement,
    setPickedHexagonCoordinates,
    zoomToCoordinates,

    connectionsDensitySource,
    setConnectionsDensitySource,
  };

  return <MainContext.Provider value={value}>{children}</MainContext.Provider>;
};

export const useMainContext = () => {
  const context = useContext(MainContext);
  if (!context) {
    throw new Error('useMainContext must be used within a MainContextProvider');
  }

  return context;
};
