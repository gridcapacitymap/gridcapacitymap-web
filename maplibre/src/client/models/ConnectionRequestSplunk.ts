/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AdminGeo } from './AdminGeo';
import type { ConnectionEnergyKindEnum } from './ConnectionEnergyKindEnum';
import type { ConnectionKindEnum } from './ConnectionKindEnum';
import type { ConnectionStatusEnum } from './ConnectionStatusEnum';
import type { ConnectivityNode } from './ConnectivityNode';
import type { Employee } from './Employee';
import type { ExtraKeys } from './ExtraKeys';
import type { InternalGeo } from './InternalGeo';
import type { Milestone } from './Milestone';
import type { Organization } from './Organization';

export type ConnectionRequestSplunk = {
  id: string;
  created_date_time?: string;
  date_desired?: string;
  power_total: number;
  power_increase: number;
  status: ConnectionStatusEnum;
  connection_kind: ConnectionKindEnum;
  connection_energy_kind: ConnectionEnergyKindEnum;
  admin_geo: AdminGeo;
  connectivity_node: ConnectivityNode;
  account_manager: Employee;
  internal_geo: InternalGeo;
  grid_analyst: Employee;
  organization: Organization;
  extra: ExtraKeys | null;
  milestone?: Array<Milestone>;
  time?: string | null;
  source?: string | null;
};
