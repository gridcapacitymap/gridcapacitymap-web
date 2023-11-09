/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ConnectionStatusEnum } from './ConnectionStatusEnum';
import type { Employee } from './Employee';

export type ScenarioBaseApiSchema = {
  id?: string | null;
  code: string;
  name: string;
  priority?: number | null;
  created_date_time?: string;
  state: ConnectionStatusEnum | null;
  author?: Employee | null;
  net_id?: string | null;
  connection_requests_count?: number | null;
  solver_status?: string | null;
  solver_status_reason?: string | null;
};
