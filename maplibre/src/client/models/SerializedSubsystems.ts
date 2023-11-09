/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SerializedBranch } from './SerializedBranch';
import type { SerializedBus } from './SerializedBus';
import type { SerializedGenerator } from './SerializedGenerator';
import type { SerializedLoad } from './SerializedLoad';
import type { SerializedTrafo } from './SerializedTrafo';
import type { SerializedTrafo3w } from './SerializedTrafo3w';

export type SerializedSubsystems = {
  buses: Array<SerializedBus>;
  branches: Array<SerializedBranch>;
  trafos: Array<SerializedTrafo>;
  trafos3w: Array<SerializedTrafo3w>;
  loads: Array<SerializedLoad>;
  gens: Array<SerializedGenerator>;
};
