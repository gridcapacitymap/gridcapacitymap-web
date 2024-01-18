import { FC, useEffect, useState } from 'react';
import { Button, Divider, Form, Input, Modal, Row, Space } from 'antd';
import { NetworksService, SerializedNetwork } from '../../client';
import { showMessage } from '../../helpers/message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMainContext } from '../../hooks/useMainContext';
import { DefaultNetworkScenarioSelect } from './components/DefaultNetworkScenarioSelect';

const defaultFields: SerializedNetwork = { title: '', gridcapacity_cfg: {} };

export const NetworkSettingModal: FC = () => {
  const { networks, currentNetworkId } = useMainContext();
  const [form] = Form.useForm();
  const [open, setOpen] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [applyDisabled, setApplyDisabled] = useState<boolean>(true);

  const queryClient = useQueryClient();

  const onCancel = () => {
    resetFields();
    setOpen(false);
    setApplyDisabled(true);
  };

  const resetFields = () => {
    form.setFieldsValue(
      networks.find((n) => n.id === currentNetworkId) || defaultFields
    );
    setApplyDisabled(true);
  };

  const updateNetwork = async () => {
    if (currentNetworkId) {
      await NetworksService.updateNetworkMetadata({
        netId: currentNetworkId,
        requestBody: form.getFieldsValue(),
      });
    } else {
      showMessage(
        'error',
        `Current network id "${currentNetworkId}" was not found`
      );
    }
  };

  const mutation = useMutation({
    mutationFn: updateNetwork,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: (e) => showMessage('error', e),
  });

  useEffect(() => {
    const currentNetwork = networks.find((n) => n.id === currentNetworkId);
    if (currentNetwork) {
      resetFields();
      setDisabled(false);
    } else {
      onCancel();
      setDisabled(true);
    }
  }, [networks, currentNetworkId]);

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
              networks.find((n) => n.id === currentNetworkId) || defaultFields
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
              <DefaultNetworkScenarioSelect netId={currentNetworkId} />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Upper load limit:"
              name={['gridcapacity_cfg', 'upper_load_limit_p_mw']}
              tooltip="Maximum temporary load power in MW used for capacity analysis"
            >
              <Input addonAfter="MW" type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Upper generation limit:"
              name={['gridcapacity_cfg', 'upper_gen_limit_p_mw']}
              tooltip="Maximum temporary generated power in MW used for capacity analysis"
            >
              <Input addonAfter="MW" type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Load power factor:"
              name={['gridcapacity_cfg', 'load_power_factor']}
              tooltip="Temporary load power factor in range [0..1] used for capacity analysis"
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Generation power factor:"
              name={['gridcapacity_cfg', 'gen_power_factor']}
              tooltip="Temporary generator power factor in range [0..1] used for capacity analysis"
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Headroom tolerance:"
              name={['gridcapacity_cfg', 'headroom_tolerance_p_mw']}
              tooltip="Temporary load/generator tolerance in MW used to terminate further capacity analysis"
            >
              <Input addonAfter="MW" type="number" />
            </Form.Item>
            <Form.Item<SerializedNetwork>
              label="Maximum iterations:"
              name={['gridcapacity_cfg', 'max_iterations']}
              tooltip="Number of capacity analysis linear search iterations"
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
                    onClick={() => mutation.mutate()}
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
