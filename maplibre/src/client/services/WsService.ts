/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class WsService {
  /**
   * Websocket Example
   * @returns any Successful Response
   * @throws ApiError
   */
  public static websocketExample(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/ws/',
    });
  }
}
