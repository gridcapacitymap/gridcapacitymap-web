import { Button, Card } from 'antd';
import { FC, useEffect, useState } from 'react';
import { useMainContext } from '../../context/MainContext';
import { CloseOutlined, CopyOutlined } from '@ant-design/icons';
import {
  CardTabEnum,
  ISetStateOnChange,
  PickedElementTypeEnum,
} from '../../helpers/interfaces';
import { CardTabListType } from 'antd/es/card';
import {
  BusHeadroomSchema_Output,
  ConnectionRequestApiSchema,
} from '../../client';
import { showMessage } from '../../helpers/message';
import { CardTitle } from './components/CardTitle';
import { TreeTab } from './components/TreeTab';
import { JsonTab } from './components/JsonTab';
import { BusPowerTab } from './components/BusPowerTab';
import { checkBusTypeSupportsConReqEnergyKind } from '../../helpers/checkups';
import { ConnectionPowerTab } from './components/ConnectionPowerTab';

const defaultTabs: CardTabListType[] = [
  { key: CardTabEnum.tree, tab: CardTabEnum.tree },
  { key: CardTabEnum.json, tab: CardTabEnum.json },
];

const tabsForBus: CardTabListType[] = [
  ...defaultTabs,
  { key: CardTabEnum.power, tab: CardTabEnum.power },
];

const tabsForConnection: CardTabListType[] = [
  ...defaultTabs,
  { key: CardTabEnum.power, tab: CardTabEnum.power },
];

export const PickedElementCard: FC = () => {
  const mainContext = useMainContext();

  const [currentTab, setCurrentTab] = useState<keyof typeof CardTabEnum>(
    CardTabEnum.tree
  );
  const [tabs, setTabs] = useState<CardTabListType[]>([]);
  const [pickedElementHeadroom, setPickedElementHeadroom] =
    useState<BusHeadroomSchema_Output | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (mainContext.pickedElement?.type === PickedElementTypeEnum.bus) {
      setTabs(tabsForBus);
      setCurrentTab(CardTabEnum.power);
      setPickedElementHeadroom(
        mainContext.headroom.filter((h) => {
          return h.bus.number == mainContext.pickedElement?.properties?.number;
        })[0]
      );
    } else if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.branch
    ) {
      setTabs(defaultTabs);
      setCurrentTab(CardTabEnum.tree);
      setPickedElementHeadroom(null);
    } else if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.connection
    ) {
      setTabs(tabsForConnection);
      setCurrentTab(CardTabEnum.power);
      setPickedElementHeadroom(null);
    }
  }, [mainContext.pickedElement, mainContext.headroom]);

  useEffect(() => {
    if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.bus &&
      pickedElementHeadroom
    ) {
      if (pickedElementHeadroom.gen_lf?.v) {
        setWarning(
          `Generation limitation factor error: ${pickedElementHeadroom.gen_lf?.v}`
        );
      } else if (pickedElementHeadroom.load_lf?.v) {
        setWarning(
          `Load limitation factor error: ${pickedElementHeadroom.load_lf?.v}`
        );
      } else {
        setWarning(null);
      }
    } else if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.connection
    ) {
      const connectivityBus = mainContext.busesGeoSource.data.features.find(
        (b) =>
          b.properties.number ==
          (mainContext.pickedElement?.properties as ConnectionRequestApiSchema)
            .connectivity_node.id
      );
      if (connectivityBus) {
        checkBusTypeSupportsConReqEnergyKind(
          connectivityBus.properties,
          mainContext.pickedElement.properties as ConnectionRequestApiSchema
        )
          ? setWarning(null)
          : setWarning(
              `Connection request has energy kind that not supported by connectivity bus`
            );
      }
    } else {
      setWarning(null);
    }
  }, [mainContext.pickedElement, pickedElementHeadroom]);

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
            maxHeight: 'calc(40vh - 80px)', // ant-design has no options to to set card's content scrolling only
            overflow: 'auto',
          }}
          title={<CardTitle warning={warning} />}
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
            <TreeTab
              pickedElement={mainContext.pickedElement}
              pickedElementHeadroom={pickedElementHeadroom}
            />
          ) : null}
          {currentTab === CardTabEnum.json ? (
            <JsonTab
              pickedElement={mainContext.pickedElement}
              pickedElementHeadroom={pickedElementHeadroom}
            />
          ) : null}
          {currentTab === CardTabEnum.power ? (
            <>
              {mainContext.pickedElement.type === PickedElementTypeEnum.bus && (
                <BusPowerTab
                  pickedElement={mainContext.pickedElement}
                  pickedElementHeadroom={pickedElementHeadroom}
                  warning={warning}
                />
              )}
              {mainContext.pickedElement.type ===
                PickedElementTypeEnum.connection && (
                <ConnectionPowerTab
                  pickedElement={mainContext.pickedElement}
                  warning={warning}
                />
              )}
            </>
          ) : null}
        </Card>
      ) : null}
    </>
  );
};
