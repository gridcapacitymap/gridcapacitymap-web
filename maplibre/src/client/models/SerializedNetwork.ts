/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { GridCapacityConfig } from './GridCapacityConfig';
import type { PolygonGeometry } from './PolygonGeometry';
import type { SolverBackend } from './SolverBackend';

export type SerializedNetwork = {
  id?: string | null;
  title: string;
  created_at?: string | null;
  deleted_at?: string | null;
  geom?: PolygonGeometry | null;
  gridcapacity_cfg: GridCapacityConfig | null;
  solver_backend?: SolverBackend | null;
  default_scenario_id?: string | null;
};
