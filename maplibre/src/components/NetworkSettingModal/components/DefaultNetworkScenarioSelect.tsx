import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import { FC } from 'react';
import { ScenariosService } from '../../../client';

type Props = {
  netId: string | null;
};

export const DefaultNetworkScenarioSelect: FC<Props> = ({ netId }) => {
  const {
    data: networkScenarios,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['NetworkScenarios', netId],
    queryFn: async () => {
      if (null && netId) {
        return await ScenariosService.listConnectionScenarios({
          netId: netId,
          limit: 9,
        });
      } else {
        throw 'Network id is not defined';
      }
    },
    select: (data) => data.items,
  });

  return (
    <Select
      options={networkScenarios?.map((s) => ({
        label: s.name,
        value: s.id,
      }))}
      loading={isLoading || isFetching}
      placeholder={<>{error}</>}
      allowClear
      showSearch
      optionFilterProp="label"
    />
  );
};
