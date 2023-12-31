import { FC, Key, ReactNode, useEffect, useMemo, useState } from 'react';
import { useMainContext } from '../../../context/MainContext';
import { ConnectionRequestApiSchema } from '../../../client';
import { COLOR_RED } from '../../../helpers/dataConverting';
import { Col, Row, Space, Tooltip, Tree, Typography } from 'antd';
import { ExclamationCircleTwoTone } from '@ant-design/icons';

const { Text } = Typography;

type SelectableTreeItem = {
  key: Key;
  title: ReactNode;
  children: SelectableTreeItemChild[];
  checked?: boolean;
  disabled?: boolean;
};

type SelectableTreeItemChild = Omit<SelectableTreeItem, 'children'>;

type Prop = {
  onPreSelectedIdsChange: (ids: string[]) => void;
};

export const SelectableConnectionsTree: FC<Prop> = ({
  onPreSelectedIdsChange,
}) => {
  const mainContext = useMainContext();

  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [halfCheckedIds, setHalfCheckedIds] = useState<string[]>([]);

  const BUS_TREE_KEY_PREFIX = 'bus/';

  const connectionIdsPerBusKey = useMemo<Record<string, string[]>>(() => {
    return mainContext.selectedConnectionRequestsUnified.reduce(
      (connectionIdsPerBusName: Record<string, string[]>, c) => {
        const busKey = `${BUS_TREE_KEY_PREFIX}${c.connectivity_node.id}`;

        if (connectionIdsPerBusName[busKey]) {
          connectionIdsPerBusName[busKey].push(c.id);
        } else {
          connectionIdsPerBusName[busKey] = [c.id];
        }

        return connectionIdsPerBusName;
      },
      {}
    );
  }, [mainContext.selectedConnectionRequestsUnified]);

  const ConnectionsPerBusTreeData = useMemo<
    SelectableTreeItem[]
  >((): SelectableTreeItem[] => {
    return mainContext.selectedConnectionRequestsUnified.reduce(
      (
        connectionsPerBus: SelectableTreeItem[],
        selectedConnection: ConnectionRequestApiSchema
      ) => {
        const itemWithConnectivityBusIndex = connectionsPerBus.findIndex(
          (item: SelectableTreeItem) =>
            item.key ===
            `${BUS_TREE_KEY_PREFIX}${selectedConnection.connectivity_node.id}`
        );

        const caseConnectionHasWarnings =
          mainContext.connectionRequestWarnings[selectedConnection.id] &&
          Object.values(
            mainContext.connectionRequestWarnings[selectedConnection.id]
          ).some((w) => w !== null);

        const itemToPush: SelectableTreeItemChild = {
          key: selectedConnection.id,
          title: caseConnectionHasWarnings ? (
            <Tooltip
              title={
                <Space direction="vertical">
                  {(
                    Object.values(
                      mainContext.connectionRequestWarnings[
                        selectedConnection.id
                      ]
                    ).filter((w) => w !== null) as string[]
                  ).map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </Space>
              }
            >
              <span style={{ color: COLOR_RED }}>
                {selectedConnection.project_id}
              </span>
            </Tooltip>
          ) : (
            selectedConnection.project_id
          ),
          disabled: Boolean(
            mainContext.currentScenarioConnectionRequestsUnified.find(
              (sc) => sc.id === selectedConnection.id
            )
          ),
          checked: true,
        };

        if (itemWithConnectivityBusIndex !== -1) {
          connectionsPerBus[itemWithConnectivityBusIndex].children.push(
            itemToPush
          );
        } else {
          const increasePerEnergyKind =
            mainContext.selectedConnectionRequestsUnified
              .filter(
                (c) =>
                  c.connectivity_node.id ===
                  selectedConnection.connectivity_node.id
              )
              .reduce(
                (powerIncreasePerEnergyKind: Record<string, number>, c) => {
                  if (
                    Object.prototype.hasOwnProperty.call(
                      powerIncreasePerEnergyKind,
                      c.connection_energy_kind
                    )
                  ) {
                    powerIncreasePerEnergyKind[c.connection_energy_kind] =
                      powerIncreasePerEnergyKind[c.connection_energy_kind] +
                      c.power_increase;
                  } else {
                    powerIncreasePerEnergyKind[c.connection_energy_kind] =
                      c.power_increase;
                  }
                  return powerIncreasePerEnergyKind;
                },
                {}
              );

          const caseBusConnectionsHaveWarnings =
            mainContext.selectedConnectionRequestsUnified
              .filter(
                (c) =>
                  c.connectivity_node.id ===
                  selectedConnection.connectivity_node.id
              )
              .some(
                (connection) =>
                  mainContext.connectionRequestWarnings[connection.id] &&
                  Object.values(
                    mainContext.connectionRequestWarnings[connection.id]
                  ).some((w) => w !== null)
              );

          connectionsPerBus.push({
            key: `${BUS_TREE_KEY_PREFIX}${selectedConnection.connectivity_node.id}`,
            title: (
              <Col>
                <Row>
                  {caseBusConnectionsHaveWarnings ? (
                    <Tooltip title="Bus has connection requests with warning">
                      {`Bus: ${selectedConnection.connectivity_node.id}`}
                      <ExclamationCircleTwoTone
                        style={{ marginLeft: '8px' }}
                        twoToneColor={COLOR_RED}
                      />
                    </Tooltip>
                  ) : (
                    `Bus: ${selectedConnection.connectivity_node.id}`
                  )}
                </Row>
                {Object.keys(increasePerEnergyKind).map((energyKind) => (
                  <Row key={energyKind}>
                    <Text type="secondary">
                      {`${energyKind}: ${increasePerEnergyKind[energyKind]} MW`}
                    </Text>
                  </Row>
                ))}
              </Col>
            ),
            children: [itemToPush],
            checked: true,
          });
        }

        return connectionsPerBus;
      },
      [] as SelectableTreeItem[]
    );
  }, [
    mainContext.connectionRequestWarnings,
    mainContext.selectedConnectionRequestsUnified,
    mainContext.currentScenarioConnectionRequestsUnified,
  ]);

  const onCheck = (checked: string[]) => {
    const checkedResult: string[] = [];
    const halfCheckedResult: string[] = [];

    for (const busKey in connectionIdsPerBusKey) {
      const checkedOfCurrentBusKey = connectionIdsPerBusKey[busKey].filter(
        (id) => checked.includes(id)
      );

      if (checkedIds.includes(busKey) && !checked.includes(busKey)) {
        const scenarioConnectionKeys = checkedOfCurrentBusKey.filter(
          (checkedId) =>
            mainContext.currentScenarioConnectionRequestsUnified.find(
              (c) => c.id === checkedId
            )
        );

        if (scenarioConnectionKeys.length === checkedOfCurrentBusKey.length) {
          checkedResult.push(busKey);
        } else if (scenarioConnectionKeys.length > 0) {
          halfCheckedResult.push(busKey);
        }

        scenarioConnectionKeys.forEach((k) => checkedResult.push(k));

        continue;
      } else if (!checkedIds.includes(busKey) && checked.includes(busKey)) {
        checkedResult.push(busKey);
        connectionIdsPerBusKey[busKey].forEach((k) => checkedResult.push(k));

        continue;
      }

      if (
        checkedOfCurrentBusKey.length === connectionIdsPerBusKey[busKey].length
      ) {
        checkedResult.push(busKey);
        checkedOfCurrentBusKey.forEach((k) => checkedResult.push(k));
      } else if (checkedOfCurrentBusKey.length > 0) {
        halfCheckedResult.push(busKey);
        checkedOfCurrentBusKey.forEach((k) => checkedResult.push(k));
      }
    }

    setCheckedIds(checkedResult);
    setHalfCheckedIds(halfCheckedResult);
  };

  useEffect(() => {
    const keys = Object.keys(connectionIdsPerBusKey);
    setCheckedIds([
      ...keys.map((busKey) => connectionIdsPerBusKey[busKey]).flat(),
      ...keys,
    ]);
  }, [connectionIdsPerBusKey]);

  useEffect(() => {
    onPreSelectedIdsChange(
      checkedIds.filter((id) => !id.startsWith(BUS_TREE_KEY_PREFIX))
    );
  }, [checkedIds, onPreSelectedIdsChange]);

  return (
    <Tree
      treeData={ConnectionsPerBusTreeData}
      defaultExpandAll
      checkable
      checkStrictly
      selectable={false}
      checkedKeys={{ checked: checkedIds, halfChecked: halfCheckedIds }}
      onCheck={(checkedKeys: any) => {
        checkedKeys?.checked && onCheck(checkedKeys.checked);
      }}
    />
  );
};
