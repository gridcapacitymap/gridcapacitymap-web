import { FC, useEffect, useState } from 'react';
import { Button, Divider, Form, Input, Modal, Row, Select, Space } from 'antd';
import {
  NetworksService,
  ScenarioBaseApiSchema,
  ScenariosService,
  SerializedNetwork,
} from '../../client';
import { useMainContext } from '../../context/MainContext';
import { showMessage } from '../../helpers/message';

const defaultFields: SerializedNetwork = { title: '', gridcapacity_cfg: {} };

export const NetworkSettingModal: FC = () => {
  const mainContext = useMainContext();
  const [form] = Form.useForm();
  const [open, setOpen] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [applyDisabled, setApplyDisabled] = useState<boolean>(true);
  const [networkScenarios, setNetworkScenarios] = useState<
    ScenarioBaseApiSchema[]
  >([]);

  const onCancel = () => {
    resetFields();
    setOpen(false);
    setApplyDisabled(true);
  };

  const resetFields = () => {
    form.setFieldsValue(
      mainContext.networks.find((n) => n.id === mainContext.currentNetworkId) ||
        defaultFields
    );
    setApplyDisabled(true);
  };

  const onApplyChanges = () => {
    if (mainContext.currentNetworkId) {
      NetworksService.updateNetworkMetadata({
        netId: mainContext.currentNetworkId,
        requestBody: form.getFieldsValue(),
      })
        .then(() => {
          NetworksService.listNetworks()
            .then(mainContext.setNetworks)
            .catch((e) => showMessage('error', 'e'));
        })
        .catch((e) => showMessage('error', e));
    } else {
      showMessage(
        'error',
        `Current network id "${mainContext.currentNetworkId}" was not found`
      );
    }
  };

  useEffect(() => {
    if (mainContext.currentNetworkId) {
      ScenariosService.listConnectionScenarios({
        netId: mainContext.currentNetworkId,
        limit: 999,
      })
        .then((res) => setNetworkScenarios(res.items))
        .catch((e) => showMessage('error', e));
    }
    setApplyDisabled(true);
  }, [mainContext.currentNetworkId]);

  useEffect(() => {
    const currentNetwork = mainContext.networks.find(
      (n) => n.id === mainContext.currentNetworkId
    );
    if (currentNetwork) {
      resetFields();
      setDisabled(false);
    } else {
      onCancel();
      setDisabled(true);
    }
  }, [mainContext.networks, mainContext.currentNetworkId]);

  return (
    <>
      <Button size="small" disabled={disabled} onClick={() => setOpen(true)}>
        Settings
      </Button>
      <Modal
        title="Current network setting"
        width={600}
        open={open}
        onCancel={onCancel}
        footer={null}
      >
        <Row>
          <Form
            name="network-details"
            style={{ width: '100%' }}
            layout="vertical"
            form={form}
            initialValues={
              mainContext.networks.find(
                (n) => n.id === mainContext.currentNetworkId
              ) || defaultFields
            }
            autoComplete="off"
            onValuesChange={() => setApplyDisabled(false)}
          >
            <Form.Item<SerializedNetwork>
              label="Title:"
              name="title"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Default scenario:"
              name="default_scenario_id"
              tooltip="This scenario's data will be loaded when this network is selected"
            >
              <Select
                options={networkScenarios.map((s) => ({
                  label: s.name,
                  value: s.id,
                }))}
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Upper load limit:"
              name={['gridcapacity_cfg', 'upper_load_limit_p_mw']}
              tooltip="Increases load headroom capacity"
            >
              <Input addonAfter="MW" type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Upper generation limit:"
              name={['gridcapacity_cfg', 'upper_gen_limit_p_mw']}
              tooltip="Increases generation headroom capacity"
            >
              <Input addonAfter="MW" type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Load power factor:"
              name={['gridcapacity_cfg', 'load_power_factor']}
              tooltip="Ratio of active load power to total power flowing in the network"
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Generation power factor:"
              name={['gridcapacity_cfg', 'gen_power_factor']}
              tooltip="Ratio of active generation power to total power flowing in the network"
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Headroom tolerance:"
              name={['gridcapacity_cfg', 'headroom_tolerance_p_mw']}
              tooltip="hint"
            >
              <Input addonAfter="MW" type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Maximum iterations:"
              name={['gridcapacity_cfg', 'max_iterations']}
              tooltip="hint"
            >
              <Input type="number" />
            </Form.Item>
            <Divider />
            <Form.Item>
              <Row justify="end">
                <Space align="end">
                  <Button onClick={resetFields}>Reset</Button>
                  <Button onClick={onCancel}>Cancel</Button>
                  <Button
                    disabled={applyDisabled}
                    onClick={onApplyChanges}
                    type="primary"
                  >
                    Apply
                  </Button>
                </Space>
              </Row>
            </Form.Item>
          </Form>
        </Row>
      </Modal>
    </>
  );
};
