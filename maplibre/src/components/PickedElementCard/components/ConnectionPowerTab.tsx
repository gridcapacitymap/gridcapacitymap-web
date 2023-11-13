import { FC } from 'react';
import { IPickedElement } from '../../../helpers/interfaces';
import { Card, Statistic, Tag } from 'antd';
import { ArrowUpOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ConnectionRequestApiSchema } from '../../../client';

type Props = {
  warning: string | null;
  pickedElement: IPickedElement;
};

export const ConnectionPowerTab: FC<Props> = ({ pickedElement, warning }) => {
  return (
    <>
      {warning ? (
        <Tag
          style={{ width: '100%', marginBottom: '8px' }}
          icon={<ExclamationCircleOutlined />}
          color="error"
        >
          {warning}
        </Tag>
      ) : null}
      <Card size="small">
        <Statistic
          title={
            (pickedElement.properties as ConnectionRequestApiSchema)
              .connection_energy_kind
          }
          value={
            (pickedElement.properties as ConnectionRequestApiSchema)
              .power_increase
          }
          prefix={<ArrowUpOutlined />}
          suffix="MW"
        />
      </Card>
    </>
  );
};
