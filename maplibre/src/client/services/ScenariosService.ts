/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConnectionScenarioUnified } from '../models/ConnectionScenarioUnified';
import type { PaginatedResponse_ScenarioBaseApiSchema_ } from '../models/PaginatedResponse_ScenarioBaseApiSchema_';
import type { ScenarioDetailsApiSchema } from '../models/ScenarioDetailsApiSchema';
import type { ScenarioHeadroomSchema } from '../models/ScenarioHeadroomSchema';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class ScenariosService {
  /**
   * List Connection Scenarios
   * @returns PaginatedResponse_ScenarioBaseApiSchema_ Successful Response
   * @throws ApiError
   */
  public static listConnectionScenarios({
    netId,
    authorFullName = '',
    solverStatus,
    limit = 100,
    offset,
  }: {
    netId: string;
    authorFullName?: string;
    solverStatus?: Array<string>;
    limit?: number;
    offset?: number;
  }): CancelablePromise<PaginatedResponse_ScenarioBaseApiSchema_> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/scenarios/',
      path: {
        net_id: netId,
      },
      query: {
        author_full_name: authorFullName,
        solver_status: solverStatus,
        limit: limit,
        offset: offset,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Create Scenario
   * @returns any Successful Response
   * @throws ApiError
   */
  public static createScenario({
    netId,
    requestBody,
  }: {
    netId: string;
    requestBody: ConnectionScenarioUnified;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/nets/{net_id}/scenarios/',
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
   * Get Scenario Details
   * @returns ScenarioDetailsApiSchema Successful Response
   * @throws ApiError
   */
  public static getScenarioDetails({
    netId,
    scenarioId,
  }: {
    netId: string;
    scenarioId: string;
  }): CancelablePromise<ScenarioDetailsApiSchema> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/nets/{net_id}/scenarios/{scenario_id}',
      path: {
        net_id: netId,
        scenario_id: scenarioId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Patch Scenario Headroom
   * Replace calculated headroom for given scenario
   * @returns any Successful Response
   * @throws ApiError
   */
  public static patchScenarioHeadroom({
    netId,
    scenarioId,
    requestBody,
  }: {
    netId: string;
    scenarioId: string;
    requestBody: ScenarioHeadroomSchema;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/nets/{net_id}/scenarios/{scenario_id}',
      path: {
        net_id: netId,
        scenario_id: scenarioId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Remove Scenario
   * @returns any Successful Response
   * @throws ApiError
   */
  public static removeScenario({
    netId,
    scenarioId,
  }: {
    netId: string;
    scenarioId: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/nets/{net_id}/scenarios/{scenario_id}',
      path: {
        net_id: netId,
        scenario_id: scenarioId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Calculate Scenario
   * @returns any Successful Response
   * @throws ApiError
   */
  public static calculateScenario({
    netId,
    scenarioId,
    onlyAffectedBuses,
  }: {
    netId: string;
    scenarioId: string;
    onlyAffectedBuses?: number;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/nets/{net_id}/scenarios/{scenario_id}/calculation',
      path: {
        net_id: netId,
        scenario_id: scenarioId,
      },
      query: {
        only_affected_buses: onlyAffectedBuses,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
