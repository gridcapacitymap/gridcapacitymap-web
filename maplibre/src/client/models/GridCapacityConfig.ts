/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type GridCapacityConfig = {
  case_name?: string;
  upper_load_limit_p_mw?: number | null;
  upper_gen_limit_p_mw?: number | null;
  load_power_factor?: number | null;
  gen_power_factor?: number | null;
  headroom_tolerance_p_mw?: number | null;
  solver_opts?: Record<string, any> | null;
  max_iterations?: number | null;
  normal_limits?: Record<string, any> | null;
  contingency_limits?: Record<string, any> | null;
  contingency_scenario?: Record<string, any> | null;
  use_full_newton_raphson?: boolean | null;
  connection_scenario?: Record<string, any> | null;
  selected_buses_ids?: Array<string> | null;
};
