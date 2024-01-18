import { FC, useEffect, useState } from 'react';
import { PickedElementTypeEnum } from '../../../helpers/interfaces';
import { Checkbox, Space, Tooltip } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ConnectionRequestApiSchema } from '../../../client';
import { ExclamationCircleTwoTone } from '@ant-design/icons';
import { COLOR_RED } from '../../../helpers/dataConverting';
import { useMainContext } from '../../../hooks/useMainContext';

type Props = {
  warnings: string[];
};

export const CardTitle: FC<Props> = ({ warnings }) => {
  const {
    pickedElement,
    setSelectedConnectionRequests,
    selectedConnectionRequests,
    currentScenarioConnectionRequests,
  } = useMainContext();

  const [title, setTitle] = useState<string>();

  useEffect(() => {
    if (pickedElement?.type === PickedElementTypeEnum.bus) {
      setTitle(`Bus: ${pickedElement.properties.name}`);
    } else if (pickedElement?.type === PickedElementTypeEnum.branch) {
      setTitle(
        `Branch: ${pickedElement.properties.from_bus.name} - ${pickedElement.properties.to_bus.name}`
      );
    } else if (pickedElement?.type === PickedElementTypeEnum.connection) {
      setTitle(`Connection Request: ${pickedElement.properties.project_id}`);
    }
  }, [pickedElement]);

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    if (e.target.checked && pickedElement?.properties) {
      setSelectedConnectionRequests((prev) => [
        ...prev,
        pickedElement!.properties as ConnectionRequestApiSchema,
      ]);
    } else if (!e.target.checked && pickedElement?.properties) {
      setSelectedConnectionRequests((prev) =>
        prev.filter((c) => c.id !== pickedElement?.properties.id)
      );
    }
  };

  return (
    <>
      {pickedElement?.type === PickedElementTypeEnum.connection ? (
        <Checkbox
          className="mr-2"
          checked={selectedConnectionRequests.some(
            (c) => c.id === pickedElement?.properties.id
          )}
          disabled={currentScenarioConnectionRequests.some(
            (c) => c.id === pickedElement?.properties.id
          )}
          onChange={onCheckboxChange}
        />
      ) : null}
      {title}
      {warnings.length ? (
        <Tooltip
          title={
            <Space direction="vertical">
              {warnings.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </Space>
          }
        >
          <ExclamationCircleTwoTone
            style={{ marginLeft: '8px' }}
            twoToneColor={COLOR_RED}
          />
        </Tooltip>
      ) : null}
    </>
  );
};
