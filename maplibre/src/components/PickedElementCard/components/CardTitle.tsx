import { FC, useEffect, useState } from 'react';
import { PickedElementTypeEnum } from '../../../helpers/interfaces';
import { Checkbox, Tooltip } from 'antd';
import { useMainContext } from '../../../context/MainContext';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ConnectionRequestApiSchema } from '../../../client';
import { ExclamationCircleTwoTone } from '@ant-design/icons';
import { COLOR_RED } from '../../../helpers/dataConverting';

type Props = {
  warning: string | null;
};

export const CardTitle: FC<Props> = ({ warning }) => {
  const mainContext = useMainContext();

  const [title, setTitle] = useState<string>();

  useEffect(() => {
    if (mainContext.pickedElement?.type === PickedElementTypeEnum.bus) {
      setTitle(`Bus: ${mainContext.pickedElement.properties.name}`);
    } else if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.branch
    ) {
      setTitle(
        `Branch: ${mainContext.pickedElement.properties.from_bus.name} - ${mainContext.pickedElement.properties.to_bus.name}`
      );
    } else if (
      mainContext.pickedElement?.type === PickedElementTypeEnum.connection
    ) {
      setTitle(
        `Connection Request: ${mainContext.pickedElement.properties.project_id}`
      );
    }
  }, [mainContext.pickedElement]);

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    if (e.target.checked && mainContext.pickedElement?.properties) {
      mainContext.setSelectedConnectionRequestsUnified((prev) => [
        ...prev,
        mainContext.pickedElement!.properties as ConnectionRequestApiSchema,
      ]);
    } else if (!e.target.checked && mainContext.pickedElement?.properties) {
      mainContext.setSelectedConnectionRequestsUnified((prev) =>
        prev.filter((c) => c.id !== mainContext.pickedElement?.properties.id)
      );
    }
  };

  return (
    <>
      {mainContext.pickedElement?.type === PickedElementTypeEnum.connection ? (
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
      ) : null}
      {title}
      {warning ? (
        <Tooltip title={warning}>
          <ExclamationCircleTwoTone
            style={{ marginLeft: '8px' }}
            twoToneColor={COLOR_RED}
          />
        </Tooltip>
      ) : null}
    </>
  );
};
