import { FC, Key, useState } from 'react';
import { Button, Col, Modal, Row, Switch } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import { ColumnWithKeyType } from '../../types';

interface IProps {
  allColumns: ColumnWithKeyType[];
  setShowedColumnKeys: (p: Key[]) => void;
  showedColumnKeys: Key[];
}

export const ColumnsSettingModal: FC<IProps> = ({
  allColumns,
  showedColumnKeys,
  setShowedColumnKeys,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [tempColumnKeysState, setTempColumnKeysState] = useState<Key[]>(
    allColumns.reduce((filtered, column) => {
      return column.key && showedColumnKeys.includes(column.key)
        ? [...filtered, column.key]
        : filtered;
    }, [] as Key[])
  );

  const onCancel = () => {
    setOpen(false);
    setTempColumnKeysState(
      allColumns.reduce((filtered, column) => {
        return column.key && showedColumnKeys.includes(column.key)
          ? [...filtered, column.key]
          : filtered;
      }, [] as Key[])
    );
  };

  const onAccept = () => {
    setShowedColumnKeys(tempColumnKeysState);
    setOpen(false);
  };

  const onChange = (key: Key, checked: boolean) => {
    if (checked) {
      setTempColumnKeysState((prev) => [...prev, key]);
    } else {
      setTempColumnKeysState((prev) => prev.filter((k) => k !== key));
    }
  };

  return (
    <>
      <Button icon={<TableOutlined />} onClick={() => setOpen(true)}>
        Columns
      </Button>
      <Modal open={open} onCancel={onCancel} onOk={onAccept}>
        <Col>
          <Row justify="center">Columns setting</Row>
          {allColumns.map((column) => (
            <Row key={column.key} className="ma-4">
              <Switch
                className="mr-2"
                onChange={(checked) => onChange(column.key, checked)}
                checked={tempColumnKeysState.includes(column.key)}
              />
              <b>{`${column.title}`}</b>
            </Row>
          ))}
        </Col>
      </Modal>
    </>
  );
};
