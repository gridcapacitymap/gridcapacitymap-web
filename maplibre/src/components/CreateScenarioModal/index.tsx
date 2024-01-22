import { Button, Col, Divider, Input, Modal, Row, Tag, Tooltip } from 'antd';
import { FC, useEffect, useMemo, useState } from 'react';
import { ConnectionStatusEnum, ScenariosService } from '../../client';
import { showMessage } from '../../utils/message';
import { SelectableConnectionsTree } from './components/SelectableConnectionsTree';
import { useMainContext } from '../../hooks/useMainContext';
import { useMutation } from '@tanstack/react-query';

export const CreateScenarioModal: FC = () => {
  const {
    currentNetworkId,
    networks,
    selectedConnectionRequests,
    connectionRequestWarnings,
    setCreatedScenariosIds,
    currentScenarioConnectionRequests,
    setSelectedConnectionRequests,
  } = useMainContext();

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
    return selectedConnectionRequests
      .filter((sc) => connectionRequestWarnings[sc.id])
      .map(
        (sc) =>
          Object.values(connectionRequestWarnings[sc.id]).filter(
            (w) => w !== null
          ) as string[]
      )
      .flat();
  }, [connectionRequestWarnings]);

  useEffect(() => {
    if (warnings.length) {
      setCreateScenarioTooltip('Selected connection requests contain warnings');
    } else if (name.length < 3) {
      setCreateScenarioTooltip('Incorrect scenario name');
    }
  }, [warnings, name]);

  useEffect(() => {
    setSelectionApplyDisabled(
      !(preselectedConnectionIds.length < selectedConnectionRequests.length)
    );
  }, [preselectedConnectionIds, selectedConnectionRequests]);

  const onSelectionApply = () => {
    setSelectedConnectionRequests((prev) =>
      prev.filter((sc) => preselectedConnectionIds.includes(sc.id))
    );
  };

  const onCancel = () => {
    setOpen(false);
    setName('');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (currentNetworkId) {
        return await ScenariosService.createScenario({
          netId: currentNetworkId,
          requestBody: {
            code: name + Date.now().toString(),
            name: name,
            state: ConnectionStatusEnum._1_REQUEST,
            connection_requests_list: selectedConnectionRequests.map((sc) => ({
              ref_id: sc.id,
            })),
          },
        });
      } else {
        throw new Error('Network id is not found');
      }
    },
    onSuccess(data) {
      onCancel();
      setCreatedScenariosIds((prev) => [...prev, data.id]);
      showMessage('success', `Scenario "${name}" was successfully created.`);
    },
    onError: (e) => showMessage('error', e),
  });

  useEffect(() => {
    const caseNoSelection = selectedConnectionRequests.length < 1;
    const caseNoSelectionExcludingScenario =
      selectedConnectionRequests.length -
        currentScenarioConnectionRequests.length <
      1;

    if (caseNoSelection || caseNoSelectionExcludingScenario) {
      setDisabled(true);
      onCancel();
    } else {
      setDisabled(false);
    }
  }, [selectedConnectionRequests]);

  return (
    <>
      <Button type="primary" disabled={disabled} onClick={() => setOpen(true)}>
        Create scenario
      </Button>
      <Modal
        open={open}
        title={<Row justify="center">Create scenario</Row>}
        onCancel={onCancel}
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
              onClick={() => mutation.mutate()}
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
                {networks.find((n) => n.id === currentNetworkId)?.title ||
                  'Not found'}
              </b>
            </Col>
          </Row>
          <Row style={{ margin: '24px 0' }} justify="space-between">
            <Col span={14}>Connection requests count:</Col>
            <Col span={10}>
              <b>{selectedConnectionRequests.length}</b>
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
