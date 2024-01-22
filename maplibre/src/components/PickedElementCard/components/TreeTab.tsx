import { Tree } from 'antd';
import { FC } from 'react';
import { propertiesToTreeData } from '../../../utils/dataConverting';
import { BusHeadroomSchema_Output } from '../../../client';
import { IPickedElement } from '../../../types/pickedCard';

type Props = {
  pickedElement: IPickedElement;
  pickedElementHeadroom: BusHeadroomSchema_Output | null;
};

export const TreeTab: FC<Props> = ({
  pickedElement,
  pickedElementHeadroom,
}) => {
  return (
    <Tree
      defaultExpandAll
      treeData={propertiesToTreeData(
        pickedElementHeadroom
          ? {
              ...pickedElement.properties,
              headroom: pickedElementHeadroom,
            }
          : pickedElement.properties
      )}
    />
  );
};
