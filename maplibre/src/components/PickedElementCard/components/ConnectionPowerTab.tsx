import { FC } from 'react';
import { IPickedElement } from '../../../types/pickedCard';
import { Card, Col, Row, Statistic, Tag } from 'antd';
import { ArrowUpOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ConnectionRequestApiSchema } from '../../../client';

type Props = {
  warnings: string[];
  pickedElement: IPickedElement;
};

export const ConnectionPowerTab: FC<Props> = ({ pickedElement, warnings }) => {
  return (
    <Col>
      {warnings.map((w) => (
        <Row key={w}>
          <Tag
            style={{ width: '100%', marginBottom: '8px' }}
            icon={<ExclamationCircleOutlined />}
            color="error"
          >
            {w}
          </Tag>
        </Row>
      ))}
      <Row>
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
      </Row>
    </Col>
  );
};
