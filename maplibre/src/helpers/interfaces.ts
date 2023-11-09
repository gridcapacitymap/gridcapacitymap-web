import { LinesGeoJson, PointsGeoJson, PolygonsGeoJson } from '../client';

export interface ISomeObject {
  [key: string]: any;
}

export interface IAnyGeojsonSource {
  type: 'geojson';
  data: PointsGeoJson | LinesGeoJson | PolygonsGeoJson;
}

export enum ISourcesIdsEnum {
  branchesSourceId = 'powergrid/geo/branches',
  busesSourceId = 'powergrid/geo/buses',
  trafosSourceId = 'powergrid/geo/trafos2w',
  connectionRequestsSourceId = 'connections/geo/connection_requests',
  hexagonsConnectionRequest = 'hexagons_connection_requests',
  connectionRequestsDensity = 'connection_requests_density',
  scenarioConnectionsLinesSourceId = 'scenario-connections-lines',
}

export type ISourcesId = `${ISourcesIdsEnum}`;

export interface IBranchLimitingFactor {
  from_number: number;
  to_number: number;
  branch_id: number | string;
}

export interface ITrafoLimitingFactor {
  from_number: number;
  to_number: number;
  trafo_id: number | string;
}

export enum IViolations {
  'Violations.O_VIOLATIONS',
  'Violations.NOT_CONVERGED',
  'Violations.BUS_OVERVOLTAGE',
  'Violations.BUS_UNDERVOLTAGE',
  'Violations.BRANCH_LOADING',
  'Violations.TRAFO_LOADING',
  'Violations.TRAFO_3W_LOADING',
  'Violations.SWING_BUS_LOADING',
}

export interface ILimitingFactor {
  v: keyof typeof IViolations;
  ss: IBranchLimitingFactor | ITrafoLimitingFactor;
}

export interface IHeadroom {
  bus: {
    number: number;
    ex_name: string;
    type: number;
  };
  actual_load_mva: [number, number];
  actual_gen_mva: [number, number];
  load_avail_mva: [number, number];
  gen_avail_mva: [number, number];
  load_lf: ILimitingFactor | null;
  gen_lf: ILimitingFactor | null;
}

export interface ISavnwHeadroom {
  headroom: IHeadroom[];
}

export interface IScenarioConfig {
  connection_scenario: {
    [x: string | number]: {
      connection_request_ids: string[];
      load: [number, number] | [number];
      gen: [number, number] | [number];
    };
  };
}

export interface ILayerMetadata {
  showPopup: boolean;
  type: keyof typeof PickedElementTypeEnum;
}

export enum IConnectionRequestStatus {
  '1_request' = '1_request',
  '2_reservation' = '2_reservation',
  '4_planning' = '4_planning',
  '5_connection' = '5_connection',
  '6_network' = '6_network',
}

export enum IConnectionEnergyKind {
  consumption = 'consumption',
  production = 'production',
  consumptionProduction = 'consumptionProduction',
  other = 'other',
}

export enum IFormatToShow {
  tree = 'tree',
  json = 'json',
}

export enum CardTabEnum {
  tree = 'tree',
  json = 'json',
  power = 'power',
}

export type ISetStateOnChange = (arg: string | number) => void;

export enum PickedElementTypeEnum {
  bus = 'bus',
  branch = 'branch',
  connection = 'connection',
}

export interface IPickedElement {
  type: keyof typeof PickedElementTypeEnum;
  properties: Record<string, any>;
}

export enum ScenarioCalculationStatusEnum {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  PROGRESS = 'PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  NONE = 'NONE',
}

export interface ScenarioSubscribingProgressData {
  progress: number;
  powerflows: number;
  updated_at: number;
  state: keyof typeof ScenarioCalculationStatusEnum;
  state_reason?: string;
  scenario_id: string;
  task_id: string;
}
