/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ConnectionRequestRef } from './ConnectionRequestRef';
import type { ConnectionStatusEnum } from './ConnectionStatusEnum';
import type { Employee } from './Employee';

export type ConnectionScenarioUnified = {
  id?: string | null;
  code: string;
  name: string;
  priority?: number | null;
  created_date_time?: string;
  state: ConnectionStatusEnum | null;
  author?: Employee | null;
  connection_requests_list?: Array<ConnectionRequestRef>;
  net_id?: string | null;
};
