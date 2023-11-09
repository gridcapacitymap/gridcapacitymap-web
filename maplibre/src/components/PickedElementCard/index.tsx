import {
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  Progress,
  Row,
  Statistic,
  Tag,
  Tree,
} from 'antd';
import { FC, useEffect, useState } from 'react';
import { useMainContext } from '../../context/MainContext';
import { propertiesToTreeData } from '../../helpers/dataConvertation';
import {
  CloseOutlined,
  CopyOutlined,
  ArrowUpOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  CardTabEnum,
  IConnectionEnergyKind,
  ISetStateOnChange,
  PickedElementTypeEnum,
} from '../../helpers/interfaces';
import { CardTabListType } from 'antd/es/card';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestUnified,
} from '../../client';
import { showMessage } from '../../helpers/message';
import { CheckboxChangeEvent } from 'antd/es/checkbox';

const defaultTabs: CardTabListType[] = [
  { key: CardTabEnum.tree, tab: CardTabEnum.tree },
  { key: CardTabEnum.json, tab: CardTabEnum.json },
];

const tabsForBus: CardTabListType[] = [
  ...defaultTabs,
  { key: CardTabEnum.power, tab: CardTabEnum.power },
];

type IBusPowerData = {
  [key in IConnectionEnergyKind]?: number;
};

export const PickedElementCard: FC = () => {
  const mainContext = useMainContext();

  const [currentTab, setCurrentTab] = useState<keyof typeof CardTabEnum>(
    CardTabEnum.tree
  );
  const [tabs, setTabs] = useState<CardTabListType[]>([]);
  const [cardTitle, setCardTitle] = useState<string>('');
  const [busPowerData, setBusPowerData] = useState<IBusPowerData>({});
  const [pickedElementHeadroom, setPickedElementHeadroom] =
    useState<BusHeadroomSchema_Output | null>(null);
  const [consumptionPercent, setConsumptionPercent] = useState<number>(0);
  const [productionPercent, setProductionPercent] = useState<number>(0);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (mainContext.pickedElement?.type === PickedElementTypeEnum.bus) {
      setTabs(tabsForBus);
      setCardTitle(`Bus: ${mainContext.pickedElement.properties.name}`);
      setPickedElementHeadroom(
        mainContext.headroom.filter((h) => {
          return h.bus.number === mainContext.pickedElement?.properties?.number;
        })[0]
      );
    } else if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.branch
    ) {
      setTabs(defaultTabs);
      setCardTitle(
        `Branch: ${mainContext.pickedElement.properties.from_bus.name} - ${mainContext.pickedElement.properties.to_bus.name}`
      );
      setPickedElementHeadroom(null);
    } else if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.connection
    ) {
      setTabs(defaultTabs);
      setCardTitle(
        `Connection Request: ${mainContext.pickedElement.properties.project_id}`
      );
      setPickedElementHeadroom(null);
    }
  }, [mainContext.pickedElement, mainContext.headroom]);

  useEffect(() => {
    if (!pickedElementHeadroom) return;

    if (pickedElementHeadroom.gen_lf?.v) {
      setWarning(
        `Generation limitation factor error: ${pickedElementHeadroom.gen_lf?.v}`
      );
    } else if (pickedElementHeadroom.load_lf?.v) {
      setWarning(
        `Load limitation factor error: ${pickedElementHeadroom.load_lf?.v}`
      );
    } else if (!pickedElementHeadroom.gen_avail_mva[0]) {
      setWarning('Available production connection is 0');
    } else if (!pickedElementHeadroom.load_avail_mva[0]) {
      setWarning('Available consumption connection is 0');
    } else {
      setWarning(null);
    }
  }, [pickedElementHeadroom]);

  useEffect(() => {
    if (mainContext.pickedElement?.type === PickedElementTypeEnum.bus) {
      setBusPowerData(
        mainContext.selectedConnectionRequestsUnified
          .filter(
            (c) =>
              c.connectivity_node.id ==
                mainContext.pickedElement?.properties.number &&
              !mainContext.currentScenarioConnectionRequestsUnified.some(
                (sc) => sc.id === c.id
              )
          )
          .reduce(
            (
              dataByConnectionType: IBusPowerData,
              c: ConnectionRequestUnified
            ) => {
              if (
                // eslint-disable-next-line
                dataByConnectionType.hasOwnProperty(c.connection_energy_kind)
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
    } else if (currentTab === CardTabEnum.power) {
      setCurrentTab(CardTabEnum.tree);
    }
  }, [
    mainContext.pickedElement,
    mainContext.selectedConnectionRequestsUnified,
    mainContext.headroom,
  ]);

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

  const onClose = () => {
    mainContext.setPickedElement(null);
  };

  const onCopy = () => {
    if (mainContext.pickedElement) {
      navigator.clipboard.writeText(
        JSON.stringify(mainContext.pickedElement.properties, null, 2)
      );
      showMessage('info', 'Json copied to clipboard');
    }
  };

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    if (e.target.checked && mainContext.pickedElement?.properties) {
      mainContext.setSelectedConnectionRequestsUnified((prev) => [
        ...prev,
        mainContext.pickedElement!.properties as ConnectionRequestUnified,
      ]);
    } else if (!e.target.checked && mainContext.pickedElement?.properties) {
      mainContext.setSelectedConnectionRequestsUnified((prev) =>
        prev.filter((c) => c.id !== mainContext.pickedElement?.properties.id)
      );
    }
  };

  return (
    <>
      {mainContext.pickedElement ? (
        <Card
          style={{
            position: 'absolute',
            left: '2%',
            bottom: '2%',
            height: '40vh',
            width: '96%',
          }}
          bodyStyle={{
            maxHeight: `calc(40vh - ${warning ? '100' : '80'}px)`, // ant-design has no options to to set card's content scrolling only
            overflow: 'auto',
          }}
          title={
            <Col>
              <Row>
                {mainContext.pickedElement?.type ===
                  PickedElementTypeEnum.connection && (
                  <Checkbox
                    className="mr-2"
                    checked={mainContext.selectedConnectionRequestsUnified.some(
                      (c) => c.id === mainContext.pickedElement?.properties.id
                    )}
                    disabled={mainContext.currentScenarioConnectionRequestsUnified.some(
                      (c) => c.id === mainContext.pickedElement?.properties.id
                    )}
                    onChange={onCheckboxChange}
                  />
                )}
                {cardTitle}
              </Row>
              {warning && (
                <Row>
                  <Tag icon={<ExclamationCircleOutlined />} color="error">
                    {warning}
                  </Tag>
                </Row>
              )}
            </Col>
          }
          extra={
            <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
          }
          size="small"
          tabList={tabs}
          activeTabKey={currentTab}
          onTabChange={setCurrentTab as ISetStateOnChange}
          tabBarExtraContent={
            <Button type="text" icon={<CopyOutlined />} onClick={onCopy}>
              Copy json
            </Button>
          }
        >
          {currentTab === CardTabEnum.tree ? (
            <Tree
              treeData={propertiesToTreeData(
                pickedElementHeadroom
                  ? {
                      ...mainContext.pickedElement.properties,
                      headroom: pickedElementHeadroom,
                    }
                  : mainContext.pickedElement.properties
              )}
            />
          ) : null}
          {currentTab === CardTabEnum.json ? (
            <pre>
              {JSON.stringify(
                pickedElementHeadroom
                  ? {
                      ...mainContext.pickedElement.properties,
                      headroom: pickedElementHeadroom,
                    }
                  : mainContext.pickedElement.properties,
                null,
                2
              )}
            </pre>
          ) : null}
          {currentTab === CardTabEnum.power ? (
            <Row>
              <Col span={14}>
                {Object.keys(busPowerData).length ? (
                  <Row gutter={16}>
                    {Object.keys(IConnectionEnergyKind).map((key) => {
                      // eslint-disable-next-line
                      if (busPowerData.hasOwnProperty(key)) {
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
                <Divider
                  style={{ height: '100%', color: 'black' }}
                  type="vertical"
                />
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
                          status={
                            productionPercent < 100 ? 'active' : 'exception'
                          }
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
                          status={
                            consumptionPercent < 100 ? 'active' : 'exception'
                          }
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
          ) : null}
        </Card>
      ) : null}
    </>
  );
};
