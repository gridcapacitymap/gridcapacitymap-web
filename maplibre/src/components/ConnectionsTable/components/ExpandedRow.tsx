import { FC, useState } from 'react';
import { IFormatToShow, ISetStateOnChange } from '../../../helpers/interfaces';
import { Button, Card, Tree } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { propertiesToTreeData } from '../../../helpers/dataConverting';
import { ConnectionRequestApiSchema } from '../../../client';

interface IProps {
  record: ConnectionRequestApiSchema;
}

export const ExpandedRow: FC<IProps> = ({ record }) => {
  const [formatToShow, setFormatToShow] = useState<keyof typeof IFormatToShow>(
    IFormatToShow.tree
  );

  const onCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
  };

  return (
    <Card
      style={{ height: '30vh' }}
      bodyStyle={{
        maxHeight: 'calc(30vh - 40px)', // ant-design has no options to to set card's content scrolling only
        overflow: 'auto',
      }}
      size="small"
      tabList={[
        { key: IFormatToShow.tree, tab: IFormatToShow.tree },
        { key: IFormatToShow.json, tab: IFormatToShow.json },
      ]}
      activeTabKey={formatToShow}
      onTabChange={setFormatToShow as ISetStateOnChange}
      tabBarExtraContent={
        <Button type="text" icon={<CopyOutlined />} onClick={onCopy}>
          Copy json
        </Button>
      }
    >
      {formatToShow === IFormatToShow.tree ? (
        <Tree treeData={propertiesToTreeData(record)} />
      ) : null}
      {formatToShow === IFormatToShow.json ? (
        <pre>{JSON.stringify(record, null, 2)}</pre>
      ) : null}
    </Card>
  );
};
