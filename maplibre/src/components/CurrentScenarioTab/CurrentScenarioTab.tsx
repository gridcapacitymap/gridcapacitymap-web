import { FC } from 'react';
import { useMainContext } from '../../hooks/useMainContext';
import { Divider, Empty, Flex, Tree, Typography } from 'antd';
import { propertiesToTreeData } from '../../utils/dataConverting';

const { Text } = Typography;

export const CurrentScenarioTab: FC = () => {
  const { currentScenarioDetails } = useMainContext();

  return (
    <>
      {currentScenarioDetails ? (
        <>
          <Flex vertical>
            <Text strong>Scenario name: {currentScenarioDetails.name}</Text>
            <Text type="secondary">id: {currentScenarioDetails.id}</Text>
          </Flex>

          <Divider />
          <Tree
            style={{
              overflowY: 'scroll',
              height: 'calc(100vh - 220px)',
            }}
            selectable={false}
            treeData={propertiesToTreeData(currentScenarioDetails)}
          />
        </>
      ) : (
        <Empty description="No scenario was selected" />
      )}
    </>
  );
};
