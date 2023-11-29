import { ColumnType } from 'antd/es/table';
import { Dispatch, SetStateAction } from 'react';
import { LinesGeoJson, PointsGeoJson, PolygonsGeoJson } from '../client';
import { Key } from 'react';

export type SetState<T> = Dispatch<SetStateAction<T>>;

export interface ISomeObject {
  [key: string]: any;
}

// eslint-disable-next-line
export type ColumnWithKeyType<T = any> = ColumnType<T> & { key: Key };

export type ConnectionWarnings = {
  busAvailableLoad: string | null;
  busAvailableGen: string | null;
};

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
  warnings = 'warnings',
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
