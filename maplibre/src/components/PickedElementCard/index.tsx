import { Button, Card } from 'antd';
import { FC, useEffect, useState } from 'react';
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
import { checkConnectionRequestForWarnings } from '../../helpers/checkups';
import { ConnectionPowerTab } from './components/ConnectionPowerTab';
import { useMainContext } from '../../hooks/useMainContext';

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
  const {pickedElement, headroom, busesGeojson, setPickedElement} = useMainContext();

  const [currentTab, setCurrentTab] = useState<keyof typeof CardTabEnum>(
    CardTabEnum.tree
  );
  const [tabs, setTabs] = useState<CardTabListType[]>([]);
  const [pickedElementHeadroom, setPickedElementHeadroom] =
    useState<BusHeadroomSchema_Output | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (pickedElement?.type === PickedElementTypeEnum.bus) {
      setTabs(tabsForBus);
      setCurrentTab(CardTabEnum.power);
      setPickedElementHeadroom(
        headroom.filter((h) => {
          return h.bus.number == pickedElement?.properties?.number;
        })[0]
      );
    } else if (
      pickedElement?.type === PickedElementTypeEnum.branch
    ) {
      setTabs(defaultTabs);
      setCurrentTab(CardTabEnum.tree);
      setPickedElementHeadroom(null);
    } else if (
      pickedElement?.type === PickedElementTypeEnum.connection
    ) {
      setTabs(tabsForConnection);
      setCurrentTab(CardTabEnum.power);
      setPickedElementHeadroom(null);
    }
  }, [pickedElement, headroom]);

  useEffect(() => {
    if (
      pickedElement?.type === PickedElementTypeEnum.bus &&
      pickedElementHeadroom
    ) {
      if (pickedElementHeadroom.gen_lf?.v) {
        setWarnings([
          `Generation limitation factor error: ${pickedElementHeadroom.gen_lf?.v}`,
        ]);
      } else if (pickedElementHeadroom.load_lf?.v) {
        setWarnings([
          `Load limitation factor error: ${pickedElementHeadroom.load_lf?.v}`,
        ]);
      } else {
        setWarnings([]);
      }
    } else if (
      pickedElement?.type === PickedElementTypeEnum.connection
    ) {
      const connectionRequest = pickedElement
        .properties as ConnectionRequestApiSchema;

      const connectivityBusHeadroom = headroom.find(
        (h) => h.bus.number == connectionRequest.connectivity_node.id
      );
      const connectivityBusProperties = busesGeojson.features.find(
        (b) => b.properties.number == connectionRequest.connectivity_node.id
      )?.properties;

      const connectionWarnings = checkConnectionRequestForWarnings(
        connectionRequest,
        connectivityBusHeadroom,
        connectivityBusProperties,
        {},
        false
      );

      setWarnings(
        Object.values(connectionWarnings).filter((w) => w !== null) as string[]
      );
    } else {
      setWarnings([]);
    }
  }, [pickedElement, pickedElementHeadroom]);

  const onClose = () => {
    setPickedElement(null);
  };

  const onCopy = () => {
    if (pickedElement) {
      navigator.clipboard.writeText(
        JSON.stringify(pickedElement.properties, null, 2)
      );
      showMessage('info', 'Json copied to clipboard');
    }
  };

  return (
    <>
      {pickedElement ? (
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
          title={<CardTitle warnings={warnings} />}
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
              pickedElement={pickedElement}
              pickedElementHeadroom={pickedElementHeadroom}
            />
          ) : null}
          {currentTab === CardTabEnum.json ? (
            <JsonTab
              pickedElement={pickedElement}
              pickedElementHeadroom={pickedElementHeadroom}
            />
          ) : null}
          {currentTab === CardTabEnum.power ? (
            <>
              {pickedElement.type === PickedElementTypeEnum.bus && (
                <BusPowerTab
                  pickedElement={pickedElement}
                  pickedElementHeadroom={pickedElementHeadroom}
                  warnings={warnings}
                />
              )}
              {pickedElement.type ===
                PickedElementTypeEnum.connection && (
                <ConnectionPowerTab
                  pickedElement={pickedElement}
                  warnings={warnings}
                />
              )}
            </>
          ) : null}
        </Card>
      ) : null}
    </>
  );
};
