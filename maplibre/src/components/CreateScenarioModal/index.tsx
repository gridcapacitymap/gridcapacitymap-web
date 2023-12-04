import { Button, Col, Divider, Input, Modal, Row, Tag, Tooltip } from 'antd';
import { FC, useEffect, useMemo, useState } from 'react';
import { ConnectionStatusEnum, ScenariosService } from '../../client';
import { showMessage } from '../../helpers/message';
import { useMainContext } from '../../context/MainContext';
import { SelectableConnectionsTree } from './components/SelectableConnectionsTree';

export const CreateScenarioModal: FC = () => {
  const mainContext = useMainContext();
  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(true);
  const [preselectedConnectionIds, setPreselectedConnectionIds] = useState<
    string[]
  >([]);
  const [selectionApplyDisabled, setSelectionApplyDisabled] =
    useState<boolean>(true);
  const [createScenarioTooltip, setCreateScenarioTooltip] = useState<string>();
  const warnings = useMemo<string[]>(() => {
    return mainContext.selectedConnectionRequestsUnified
      .filter((sc) => mainContext.connectionRequestWarnings[sc.id])
      .map(
        (sc) =>
          Object.values(mainContext.connectionRequestWarnings[sc.id]).filter(
            (w) => w !== null
          ) as string[]
      )
      .flat();
  }, [mainContext.connectionRequestWarnings]);

  useEffect(() => {
    if (warnings.length) {
      setCreateScenarioTooltip('Selected connection requests contain warnings');
    } else if (name.length < 3) {
      setCreateScenarioTooltip('Incorrect scenario name');
    }
  }, [warnings, name]);

  useEffect(() => {
    setSelectionApplyDisabled(
      !(
        preselectedConnectionIds.length <
        mainContext.selectedConnectionRequestsUnified.length
      )
    );
  }, [preselectedConnectionIds, mainContext.selectedConnectionRequestsUnified]);

  const onSelectionApply = () => {
    mainContext.setSelectedConnectionRequestsUnified((prev) =>
      prev.filter((sc) => preselectedConnectionIds.includes(sc.id))
    );
  };

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
    const caseNoSelection =
      mainContext.selectedConnectionRequestsUnified.length < 1;
    const caseNoSelectionExcludingScenario =
      mainContext.selectedConnectionRequestsUnified.length -
        mainContext.currentScenarioConnectionRequestsUnified.length <
      1;

    if (caseNoSelection || caseNoSelectionExcludingScenario) {
      setDisabled(true);
      onCancel();
    } else {
      setDisabled(false);
    }
  }, [mainContext.selectedConnectionRequestsUnified]);

  return (
    <>
      <Button type="primary" disabled={disabled} onClick={() => setOpen(true)}>
        Create scenario
      </Button>
      <Modal
        open={open}
        title={<Row justify="center">Create scenario</Row>}
        onCancel={onCancel}
        onOk={onAccept}
        okText="Create scenario"
        centered={true}
        width={500}
        footer={[
          <Button
            key="applySelection"
            onClick={onSelectionApply}
            type="primary"
            disabled={selectionApplyDisabled}
          >
            Apply selection
          </Button>,
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Tooltip key="createScenario" title={createScenarioTooltip}>
            <Button
              onClick={onAccept}
              type="primary"
              disabled={name.length < 3}
            >
              Create scenario
            </Button>
          </Tooltip>,
        ]}
      >
        <Col>
          {warnings.length
            ? warnings.map((w) => (
                <Row key={w} style={{ margin: '8px 0' }}>
                  <Tag style={{ width: '100%', margin: 0 }} color="error">
                    {w}
                  </Tag>
                </Row>
              ))
            : null}
          <Row style={{ margin: '24px 0' }} justify="space-between">
            <Col span={14}>Network:</Col>
            <Col span={10}>
              <b>
                {mainContext.networks.find(
                  (n) => n.id === mainContext.currentNetworkId
                )?.title || 'Not found'}
              </b>
            </Col>
          </Row>
          <Row style={{ margin: '24px 0' }} justify="space-between">
            <Col span={14}>Connection requests count:</Col>
            <Col span={10}>
              <b>{mainContext.selectedConnectionRequestsUnified.length}</b>
            </Col>
          </Row>
          <Row>Connection requests per bus:</Row>
          <Row>
            <SelectableConnectionsTree
              onPreSelectedIdsChange={setPreselectedConnectionIds}
            />
          </Row>
          <Row style={{ margin: '24px 0' }}>
            <Input
              placeholder="Name"
              value={name}
              status={name.length < 3 ? 'error' : ''}
              type="string"
              onChange={(e) => setName(e.target.value)}
            />
          </Row>
        </Col>
        <Divider />
      </Modal>
    </>
  );
};
