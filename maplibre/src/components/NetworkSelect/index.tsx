import { FC, useEffect, useState } from 'react';
import { Select } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useMainContext } from '../../hooks/useMainContext';

export const NetworkSelect: FC = () => {
  const { networks, currentNetworkId, setCurrentNetworkId } = useMainContext();

  const [options, setOptions] = useState<DefaultOptionType[]>([]);

  useEffect(() => {
    setOptions(networks.map((net) => ({ label: net.title, value: net.id })));
  }, [networks]);

  return (
    <Select
      placeholder="Network"
      size="small"
      style={{ minWidth: 150 }}
      disabled={!options.length}
      value={currentNetworkId}
      options={options}
      onChange={setCurrentNetworkId}
    />
  );
};
