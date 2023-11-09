/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BusHeadroomSchema_Output } from './BusHeadroomSchema_Output';
import type { ConnectionRequestApiSchema } from './ConnectionRequestApiSchema';
import type { ConnectionStatusEnum } from './ConnectionStatusEnum';
import type { Employee } from './Employee';
import type { GridCapacityConfig } from './GridCapacityConfig';

export type ScenarioDetailsApiSchema = {
  id?: string | null;
  code: string;
  name: string;
  priority?: number | null;
  created_date_time?: string;
  state: ConnectionStatusEnum | null;
  author?: Employee | null;
  connection_requests_list?: Array<ConnectionRequestApiSchema>;
  net_id?: string | null;
  gridcapacity_config?: GridCapacityConfig | null;
  headroom?: Array<BusHeadroomSchema_Output> | null;
  solver_status?: string | null;
  solver_status_reason?: string | null;
};
