/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BusHeadroomMetadata } from './BusHeadroomMetadata';
import type { LimitingFactor } from './LimitingFactor';

export type BusHeadroomSchema_Output = {
  bus: BusHeadroomMetadata;
  actual_load_mva: any[];
  actual_gen_mva: any[];
  load_avail_mva: any[];
  gen_avail_mva: any[];
  load_lf?: LimitingFactor | null;
  gen_lf?: LimitingFactor | null;
};
