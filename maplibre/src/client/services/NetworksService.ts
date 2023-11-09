/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LinesGeoJson } from '../models/LinesGeoJson';
import type { PointsGeoJson } from '../models/PointsGeoJson';
import type { SerializedNetwork } from '../models/SerializedNetwork';
import type { SerializedSubsystems } from '../models/SerializedSubsystems';
import type { SubsystemGeoJson } from '../models/SubsystemGeoJson';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class NetworksService {
  /**
   * Buses Geojson
   * @returns PointsGeoJson Successful Response
   * @throws ApiError
   */
  public static busesGeojson({
    netId,
  }: {
    netId: string;
  }): CancelablePromise<PointsGeoJson> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/geojson/buses',
      path: {
        net_id: netId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Branches Geojson
   * @returns LinesGeoJson Successful Response
   * @throws ApiError
   */
  public static branchesGeojson({
    netId,
  }: {
    netId: string;
  }): CancelablePromise<LinesGeoJson> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/geojson/branches',
      path: {
        net_id: netId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Trafos Geojson
   * @returns LinesGeoJson Successful Response
   * @throws ApiError
   */
  public static trafosGeojson({
    netId,
  }: {
    netId: string;
  }): CancelablePromise<LinesGeoJson> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/geojson/trafos',
      path: {
        net_id: netId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * List Networks
   * @returns SerializedNetwork Successful Response
   * @throws ApiError
   */
  public static listNetworks(): CancelablePromise<Array<SerializedNetwork>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/',
    });
  }

  /**
   * Create Network
   * @returns SerializedNetwork Successful Response
   * @throws ApiError
   */
  public static createNetwork({
    requestBody,
  }: {
    requestBody: SerializedNetwork;
  }): CancelablePromise<SerializedNetwork> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/nets/',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Update Network Metadata
   * @returns SerializedNetwork Successful Response
   * @throws ApiError
   */
  public static updateNetworkMetadata({
    netId,
    requestBody,
  }: {
    netId: string;
    requestBody: SerializedNetwork;
  }): CancelablePromise<SerializedNetwork> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/nets/{net_id}',
      path: {
        net_id: netId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Import Net Subsystems
   * Subsystems exported via gridcapacity for network.
   * Importing it here will result in replacing exising subsystems and their related entities.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static importNetSubsystems({
    netId,
    requestBody,
  }: {
    netId: string;
    requestBody: SerializedSubsystems;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/nets/{net_id}/import/json',
      path: {
        net_id: netId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Import Net Subsystems Geodata
   * Geospatial data for the network
   * @returns any Successful Response
   * @throws ApiError
   */
  public static importNetSubsystemsGeodata({
    netId,
    requestBody,
  }: {
    netId: string;
    requestBody: SubsystemGeoJson;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/nets/{net_id}/import/geodata',
      path: {
        net_id: netId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
