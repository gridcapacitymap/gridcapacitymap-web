/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_connections_import_connections_xlsx } from '../models/Body_connections_import_connections_xlsx';
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
    area,
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
     * Coordinates (longitude, latitude) marking a polygon
     */
    area?: Array<string>;
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
        area: area,
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
  }: {
    netId: string;
    requestBody: ConnectionsUnifiedSchema_Input;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/nets/{net_id}/connections/import/unified',
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
   * Import Connections Xlsx
   * Import connection requests & scenarios from excel file. Replaces existing entities in database
   * @returns any Successful Response
   * @throws ApiError
   */
  public static importConnectionsXlsx({
    netId,
    formData,
  }: {
    netId: string;
    formData: Body_connections_import_connections_xlsx;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/nets/{net_id}/connections/import/xlsx',
      path: {
        net_id: netId,
      },
      formData: formData,
      mediaType: 'multipart/form-data',
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
