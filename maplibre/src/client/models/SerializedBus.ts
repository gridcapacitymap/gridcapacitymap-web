/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BusType } from './BusType';

export type SerializedBus = {
  number: string;
  name: string;
  bus_type: BusType;
  base_kv: number;
  voltage_pu: number;
  area_name?: string | null;
  area_number?: number | null;
  zone_name?: string | null;
  zone_number?: number | null;
  actual_load_mva: any[];
  actual_gen_mva: any[];
};
