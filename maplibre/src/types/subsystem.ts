export enum IViolations {
  'Violations.O_VIOLATIONS',
  'Violations.NOT_CONVERGED',
  'Violations.BUS_OVERVOLTAGE',
  'Violations.BUS_UNDERVOLTAGE',
  'Violations.BRANCH_LOADING',
  'Violations.TRAFO_LOADING',
  'Violations.TRAFO_3W_LOADING',
  'Violations.SWING_BUS_LOADING',
}

export enum IConnectionRequestStatus {
  '1_request' = '1_request',
  '2_reservation' = '2_reservation',
  '4_planning' = '4_planning',
  '5_connection' = '5_connection',
  '6_network' = '6_network',
}

export enum IConnectionEnergyKind {
  consumption = 'consumption',
  production = 'production',
  consumptionProduction = 'consumptionProduction',
  other = 'other',
}
