export enum ScenarioCalculationStatusEnum {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  PROGRESS = 'PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  REVOKED = 'REVOKED',
  NONE = 'NONE',
}

export interface ScenarioSubscribingProgressData {
  progress: number;
  powerflows: number;
  updated_at: number;
  state: keyof typeof ScenarioCalculationStatusEnum;
  state_reason?: string;
  scenario_id: string;
  task_id: string;
}
