import { FC, useEffect, useState } from 'react';
import { Select } from 'antd';
import { useMainContext } from '../../context/MainContext';
import { DefaultOptionType } from 'antd/es/select';

export const NetworkSelect: FC = () => {
  const mainContext = useMainContext();

  const [options, setOptions] = useState<DefaultOptionType[]>([]);

  useEffect(() => {
    setOptions(
      mainContext.networks.map((net) => ({ label: net.title, value: net.id }))
    );
  }, [mainContext.networks]);

  return (
    <Select
      placeholder="Network"
      size="small"
      style={{ minWidth: 150 }}
      disabled={!options.length}
      value={mainContext.currentNetworkId}
      options={options}
      onChange={mainContext.setCurrentNetworkId}
    />
  );
};
