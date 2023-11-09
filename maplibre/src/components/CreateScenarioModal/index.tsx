import { Button, Col, Input, Modal, Row } from 'antd';
import { FC, useEffect, useState } from 'react';
import { ConnectionStatusEnum, ScenariosService } from '../../client';
import { showMessage } from '../../helpers/message';
import { useMainContext } from '../../context/MainContext';

export const CreateScenarioModal: FC = () => {
  const mainContext = useMainContext();
  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(true);

  const onCancel = () => {
    setOpen(false);
    setName('');
  };

  const onAccept = async () => {
    try {
      const data = await ScenariosService.createScenario({
        netId: mainContext.currentNetworkId as string,
        requestBody: {
          code: name + Date.now().toString(),
          name: name,
          state: ConnectionStatusEnum._1_REQUEST,
          connection_requests_list:
            mainContext.selectedConnectionRequestsUnified.map((sc) => ({
              ref_id: sc.id,
            })),
        },
      });
      onCancel();
      mainContext.setCreatedScenariosIds((prev) => [...prev, data.id]);
      showMessage('success', `Scenario "${name}" was successfully created.`);
    } catch (e) {
      showMessage('error', e);
    }
  };

  useEffect(() => {
    setDisabled(
      1 >
        mainContext.selectedConnectionRequestsUnified.length -
          mainContext.currentScenarioConnectionRequestsUnified.length
    );
  }, [mainContext.selectedConnectionRequestsUnified]);

  return (
    <>
      <Button type="primary" disabled={disabled} onClick={() => setOpen(true)}>
        Create scenario
      </Button>
      <Modal
        open={open}
        title="Create scenario"
        onCancel={onCancel}
        onOk={onAccept}
        okText="Create scenario"
        centered={true}
        okButtonProps={{
          disabled: name.length < 3,
        }}
        width={400}
      >
        <Col>
          <Row style={{ padding: '8px 0' }}>
            <Input
              placeholder="Name"
              defaultValue={name}
              status={name.length < 3 ? 'error' : ''}
              type="string"
              onChange={(e) => setName(e.target.value)}
            />
          </Row>
        </Col>
      </Modal>
    </>
  );
};
