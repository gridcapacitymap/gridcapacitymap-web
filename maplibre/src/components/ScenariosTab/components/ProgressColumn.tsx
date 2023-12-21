import { FC } from 'react';
import { ScenarioBaseApiSchema } from '../../../client';
import { Progress } from 'antd';
import {
  ScenarioCalculationStatusEnum,
  ScenarioSubscribingProgressData,
} from '../../../helpers/interfaces';

interface Props {
  record: ScenarioBaseApiSchema;
  progressData?: ScenarioSubscribingProgressData;
}

export const ProgressColumn: FC<Props> = ({ record, progressData = null }) => {
  const percent: number = Number.isFinite(progressData?.progress)
    ? progressData?.progress || 0
    : 0;
  const status: any = progressData?.state || record.solver_status;

  const isReady = [
    ScenarioCalculationStatusEnum.SUCCESS,
    ScenarioCalculationStatusEnum.FAILURE,
    ScenarioCalculationStatusEnum.REVOKED,
  ].includes(status);

  if (status && !isReady && percent < 100) {
    return <Progress percent={percent} />;
  } else {
    return status || ScenarioCalculationStatusEnum.NONE;
  }
};
