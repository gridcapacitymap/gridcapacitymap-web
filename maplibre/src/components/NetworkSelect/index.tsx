import { Select } from 'antd';
import { FC, useContext, useEffect, useState } from 'react';
import { MainContext } from '../../context/MainContext';
import { DefaultOptionType } from 'antd/es/select';

export const NetworkSelect: FC = () => {
  const dataContext = useContext(MainContext);

  const [options, setOptions] = useState<DefaultOptionType[]>([]);

  useEffect(() => {
    if (dataContext?.networks) {
      setOptions(
        dataContext.networks.map((net) => ({ label: net.title, value: net.id }))
      );
    }
  }, [dataContext?.networks]);

  return (
    <Select
      placeholder="Network"
      size="small"
      style={{ minWidth: 150 }}
      disabled={!options.length}
      value={dataContext?.currentNetworkId}
      options={options}
      onChange={dataContext?.setCurrentNetworkId}
    />
  );
};
