/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConnectionEnergyKindEnum } from '../models/ConnectionEnergyKindEnum';
import type { ConnectionKindEnum } from '../models/ConnectionKindEnum';
import type { ConnectionRequestSplunk } from '../models/ConnectionRequestSplunk';
import type { ConnectionScenarioSplunk } from '../models/ConnectionScenarioSplunk';
import type { ConnectionStatusEnum } from '../models/ConnectionStatusEnum';
import type { ConnectionsUnifiedSchema_Input } from '../models/ConnectionsUnifiedSchema_Input';
import type { ConnectionsUnifiedSchema_Output } from '../models/ConnectionsUnifiedSchema_Output';
import type { PaginatedResponse_ConnectionRequestApiSchema_ } from '../models/PaginatedResponse_ConnectionRequestApiSchema_';
import type { PointsGeoJson } from '../models/PointsGeoJson';
import type { PolygonsGeoJson } from '../models/PolygonsGeoJson';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class ConnectionsService {
  /**
   * Get Connection Requests
   * @returns PaginatedResponse_ConnectionRequestApiSchema_ Successful Response
   * @throws ApiError
   */
  public static getConnectionRequests({
    netId,
    limit = 100,
    offset,
    busId,
    status,
    connectionKind,
    connectionEnergyKind,
    powerIncreaseGt,
    powerIncreaseLt,
    h3Id = '',
  }: {
    netId: string;
    limit?: number;
    offset?: number;
    busId?: Array<string>;
    status?: ConnectionStatusEnum | null;
    connectionKind?: ConnectionKindEnum | null;
    connectionEnergyKind?: ConnectionEnergyKindEnum | null;
    powerIncreaseGt?: number | null;
    powerIncreaseLt?: number | null;
    /**
     * H3 index
     */
    h3Id?: string;
  }): CancelablePromise<PaginatedResponse_ConnectionRequestApiSchema_> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/connections/',
      path: {
        net_id: netId,
      },
      query: {
        limit: limit,
        offset: offset,
        bus_id: busId,
        status: status,
        connection_kind: connectionKind,
        connection_energy_kind: connectionEnergyKind,
        power_increase_gt: powerIncreaseGt,
        power_increase_lt: powerIncreaseLt,
        h3id: h3Id,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Get Connection Requests Density Geojson
   * @returns PolygonsGeoJson Successful Response
   * @throws ApiError
   */
  public static getConnectionRequestsDensityGeojson({
    netId,
  }: {
    netId: string;
  }): CancelablePromise<PolygonsGeoJson> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/connections/geojson/density',
      path: {
        net_id: netId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Get Connection Requests Geojson
   * @returns PointsGeoJson Successful Response
   * @throws ApiError
   */
  public static getConnectionRequestsGeojson({
    netId,
  }: {
    netId: string;
  }): CancelablePromise<PointsGeoJson> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/connections/geojson/points',
      path: {
        net_id: netId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Export Connections Json
   * @returns ConnectionsUnifiedSchema_Output Successful Response
   * @throws ApiError
   */
  public static exportConnectionsJson({
    netId,
  }: {
    netId: string;
  }): CancelablePromise<ConnectionsUnifiedSchema_Output> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/connections/export/unified',
      path: {
        net_id: netId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Export Splunk Json
   * @returns any Successful Response
   * @throws ApiError
   */
  public static exportSplunkJson({
    netId,
  }: {
    netId: string;
  }): CancelablePromise<
    Array<ConnectionRequestSplunk | ConnectionScenarioSplunk>
  > {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/connections/export/splunk',
      path: {
        net_id: netId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Import Connections Unified Json
   * Import connection requests & scenarios from json. Replaces existing entities in database
   * @returns any Successful Response
   * @throws ApiError
   */
  public static importConnectionsUnifiedJson({
    netId,
    requestBody,
    maxBusDistance,
  }: {
    netId: string;
    requestBody: ConnectionsUnifiedSchema_Input;
    /**
     * Max distance from bus to connection request
     */
    maxBusDistance?: number;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/nets/{net_id}/connections/import/unified',
      path: {
        net_id: netId,
      },
      query: {
        max_bus_distance: maxBusDistance,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
