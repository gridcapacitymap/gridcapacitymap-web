/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { LineStringGeometry } from './LineStringGeometry';
import type { PointGeometry } from './PointGeometry';
import type { SubsystemGeoProps } from './SubsystemGeoProps';

export type SubsystemGeoFeature = {
  type: string;
  geometry: PointGeometry | LineStringGeometry;
  properties: SubsystemGeoProps;
};
