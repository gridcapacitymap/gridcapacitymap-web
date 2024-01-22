import { LinesGeoJson, PointsGeoJson, PolygonsGeoJson } from '../client';
import { PickedElementTypeEnum } from './pickedCard';

export enum LayersEnum {
  connectionRequestsHexagonalHeatmap = 'connection_requests_hexagonal_heatmap',

  calculatedConnectionRequestsLines = 'calculated_connection_requests_line',

  hexagonsConnectionRequests = 'hexagons_connection_requests',
  hexagonsConnectionRequestsLabels = 'hexagons_connection_requests_labels',

  selectedConnectionRequests = 'selected_connection_requests',
  selectedConnectionRequestsLabels = 'selected_connection_requests_labels',

  branches = 'branches',
  branchesLabels = 'branches_labels',

  branchesWithTransformer = 'branches_with_transformer',
  branchesWithTransformerLabels = 'branches_with_transformer_labels',

  buses = 'buses',
  busesLabels = 'buses_labels',

  branchesDirectionIcons = 'branches_directions_icon',
  branchesWithTransformerIcons = 'branches_with_transformer_directions_icon',
  transformerIcons = 'transformer_icon',
}

export enum SourcesIdsEnum {
  branchesSourceId = 'powergrid/geo/branches',
  busesSourceId = 'powergrid/geo/buses',
  trafosSourceId = 'powergrid/geo/trafos2w',
  connectionRequestsSourceId = 'connections/geo/connection_requests',
  hexagonsConnectionRequest = 'hexagons_connection_requests',
  connectionRequestsDensity = 'connection_requests_density',
  scenarioConnectionsLinesSourceId = 'scenario-connections-lines',
}

export interface ILayerMetadata {
  showPopup: boolean;
  type: keyof typeof PickedElementTypeEnum;
}

export interface IAnyGeojsonSource {
  type: 'geojson';
  data: PointsGeoJson | LinesGeoJson | PolygonsGeoJson;
}
