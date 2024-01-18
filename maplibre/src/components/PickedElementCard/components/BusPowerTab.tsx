import { FC, useEffect, useState } from 'react';
import { Card, Col, Divider, Empty, Progress, Row, Statistic, Tag } from 'antd';
import { ArrowUpOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import {
  IConnectionEnergyKind,
  IPickedElement,
  PickedElementTypeEnum,
} from '../../../helpers/interfaces';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestApiSchema,
} from '../../../client';
import { useMainContext } from '../../../hooks/useMainContext';

type IBusPowerData = {
  [key in IConnectionEnergyKind]?: number;
};

type Props = {
  warnings: string[];
  pickedElement: IPickedElement;
  pickedElementHeadroom: BusHeadroomSchema_Output | null;
};

export const BusPowerTab: FC<Props> = ({
  pickedElement,
  pickedElementHeadroom,
  warnings,
}) => {
  const { selectedConnectionRequests, currentScenarioConnectionRequests } =
    useMainContext();
  const [busPowerData, setBusPowerData] = useState<IBusPowerData>({});
  const [consumptionPercent, setConsumptionPercent] = useState<number>(0);
  const [productionPercent, setProductionPercent] = useState<number>(0);

  useEffect(() => {
    if (pickedElement.type === PickedElementTypeEnum.bus) {
      setBusPowerData(
        selectedConnectionRequests
          .filter(
            (c) =>
              c.connectivity_node.id == pickedElement.properties.number &&
              !currentScenarioConnectionRequests.some((sc) => sc.id === c.id)
          )
          .reduce(
            (
              dataByConnectionType: IBusPowerData,
              c: ConnectionRequestApiSchema
            ) => {
              if (
                Object.prototype.hasOwnProperty.call(
                  dataByConnectionType,
                  c.connection_energy_kind
                )
              ) {
                const accum: number =
                  dataByConnectionType[c.connection_energy_kind] || 0;

                return {
                  ...dataByConnectionType,
                  [c.connection_energy_kind]: accum + c.power_increase,
                };
              } else {
                return {
                  ...dataByConnectionType,
                  [c.connection_energy_kind]: c.power_increase,
                };
              }
            },
            {}
          )
      );
    }
  }, [pickedElement, selectedConnectionRequests]);

  useEffect(() => {
    setConsumptionPercent(
      busPowerData.consumption && pickedElementHeadroom
        ? Math.round(
            (busPowerData.consumption /
              (pickedElementHeadroom.load_avail_mva[0] / 100)) *
              10
          ) / 10
        : 0
    );
    setProductionPercent(
      busPowerData.production && pickedElementHeadroom
        ? Math.round(
            (busPowerData.production /
              (pickedElementHeadroom.gen_avail_mva[0] / 100)) *
              10
          ) / 10
        : 0
    );
  }, [pickedElementHeadroom, busPowerData]);

  return (
    <Row>
      <Col span={14}>
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
        {Object.keys(busPowerData).length ? (
          <Row gutter={16}>
            {Object.keys(IConnectionEnergyKind).map((key) => {
              if (Object.prototype.hasOwnProperty.call(busPowerData, key)) {
                return (
                  <Col key={key}>
                    <Card size="small">
                      <Statistic
                        title={key}
                        value={
                          busPowerData[
                            key as keyof typeof IConnectionEnergyKind
                          ]
                        }
                        prefix={<ArrowUpOutlined />}
                        suffix="MW"
                      />
                    </Card>
                  </Col>
                );
              } else {
                return null;
              }
            })}
          </Row>
        ) : (
          <Empty description="No selected connection request here" />
        )}
      </Col>
      <Col span={1}>
        <Divider style={{ height: '100%', color: 'black' }} type="vertical" />
      </Col>
      <Col span={9}>
        {pickedElementHeadroom?.gen_avail_mva ||
        pickedElementHeadroom?.load_avail_mva ? (
          <>
            <span>
              Production available:{' '}
              <b>{pickedElementHeadroom.gen_avail_mva[0]}</b>MW
            </span>
            <Row gutter={10}>
              <Col style={{ flexGrow: 1 }}>
                <Progress
                  showInfo={false}
                  status={productionPercent < 100 ? 'active' : 'exception'}
                  percent={productionPercent}
                />
              </Col>
              <Col>{productionPercent}%</Col>
            </Row>
            <span>
              Consumption available:{' '}
              <b>{pickedElementHeadroom.load_avail_mva[0]}</b>MW
            </span>
            <Row gutter={10}>
              <Col style={{ flexGrow: 1 }}>
                <Progress
                  showInfo={false}
                  status={consumptionPercent < 100 ? 'active' : 'exception'}
                  percent={consumptionPercent}
                />
              </Col>
              <Col>{consumptionPercent}%</Col>
            </Row>
          </>
        ) : (
          <Empty description="No headroom data" />
        )}
      </Col>
    </Row>
  );
};
