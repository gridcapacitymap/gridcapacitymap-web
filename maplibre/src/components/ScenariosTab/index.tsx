import { FC, Key, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import {
  Button,
  Dropdown,
  MenuProps,
  Popconfirm,
  Space,
  Table,
  TableColumnsType,
  TablePaginationConfig,
  Col,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { ScenarioBaseApiSchema, ScenariosService } from '../../client';
import { showMessage } from '../../utils/message';
import { ProgressColumn } from './components/ProgressColumn';
import { useScenarioProgress } from '../../hooks/useScenarioProgress';
import { ScenarioCalculationStatusEnum } from '../../types/scenario';
import SkeletonTable from '../SkeletonTable';
import { useMainContext } from '../../hooks/useMainContext';

enum columnKeysEnum {
  name = 'name',
  code = 'code',
  author = 'author',
  createdAt = 'createdAt',
  connectionRequestsCount = 'connectionRequestsCount',
  status = 'status',
  actions = 'actions',
}

const defaultPagination: TablePaginationConfig = {
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
  defaultPageSize: 10,
  pageSize: 10,
  defaultCurrent: 1,
  current: 1,
};

export const ScenariosTab: FC = () => {
  const {
    currentScenarioId,
    currentNetworkId,
    setCurrentScenarioId,
    createdScenariosIds,
  } = useMainContext();

  const [loading, setLoading] = useState<boolean>(false);
  const [connectionScenariosList, setConnectionScenariosList] = useState<
    ScenarioBaseApiSchema[]
  >([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [pagination, setPagination] =
    useState<TablePaginationConfig>(defaultPagination);

  const scenariosProgress = useScenarioProgress(connectionScenariosList);

  const allColumns: TableColumnsType<ScenarioBaseApiSchema> = [
    {
      key: columnKeysEnum.name,
      title: 'Name',
      dataIndex: 'name',
    },
    {
      key: columnKeysEnum.author,
      title: 'Author',
      dataIndex: ['author', 'full_name'],
    },
    {
      key: columnKeysEnum.createdAt,
      title: 'Created',
      dataIndex: 'created_date_time',
      render: (record: string) =>
        DateTime.fromJSDate(new Date(record)).toLocaleString(
          DateTime.DATETIME_SHORT
        ),
    },
    {
      key: columnKeysEnum.connectionRequestsCount,
      title: 'Connections',
      dataIndex: 'connection_requests_count',
      align: 'right',
    },
    {
      key: columnKeysEnum.status,
      title: 'Status',
      dataIndex: 'status',
      render: (status, record: ScenarioBaseApiSchema) => {
        return (
          <ProgressColumn
            record={record}
            progressData={scenariosProgress.find(
              (sp) => sp.scenario_id === record.id
            )}
          />
        );
      },
      shouldCellUpdate: () => true,
    },
    {
      key: columnKeysEnum.actions,
      title: 'Actions',
      render: (record: ScenarioBaseApiSchema) => (
        <Space direction="horizontal">
          <Dropdown menu={{ items: calcMenuItems(record) }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()}>
              <Space>Calc</Space>
            </a>
          </Dropdown>
          <Popconfirm
            title={`Delete "${record.name}" scenario?`}
            onConfirm={() => onScenarioDelete(record)}
            okText="Yes"
            okButtonProps={{
              danger: true,
            }}
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
      align: 'right',
    },
  ];

  useEffect(() => {
    if (selectedRowKeys[0] !== currentScenarioId) {
      setSelectedRowKeys(currentScenarioId ? [currentScenarioId] : []);
    }
  }, [currentScenarioId]);

  const onCalcClick = async (
    scenario: ScenarioBaseApiSchema,
    onlyAffectedBuses = 0
  ) => {
    try {
      if (!scenario.id) {
        showMessage('error', 'Scenario has no id');
        return;
      }
      await ScenariosService.calculateScenario({
        netId: currentNetworkId as string,
        scenarioId: scenario.id,
        onlyAffectedBuses,
      });
      showMessage('loading', `Scenario "${scenario.name}" is calculating...`);
    } catch (e: any) {
      if ((e as any).status === 409) {
        showMessage('error', e.body.detail);
      } else {
        showMessage('error', e);
      }
    }
  };

  const onScenarioDelete = async (scenario: ScenarioBaseApiSchema) => {
    try {
      await ScenariosService.removeScenario({
        netId: currentNetworkId as string,
        scenarioId: scenario.id as string,
      });
      showMessage(
        'success',
        `Scenario "${scenario.name}" was successfully deleted`
      );
      fetchConnectionScenariosList();
    } catch (e) {
      showMessage('error', e);
    }
  };

  const onRowSelectionChange = (scenarioIds: Key[]) => {
    setCurrentScenarioId(scenarioIds[0].toString());
  };

  const calcMenuItems = (record: ScenarioBaseApiSchema): MenuProps['items'] => [
    {
      label: (
        <Popconfirm
          title={`Recalculate "${record.name}" scenario?`}
          disabled={
            record.solver_status !== ScenarioCalculationStatusEnum.SUCCESS
          }
          onConfirm={() => onCalcClick(record, 0)}
        >
          <a
            href="#"
            onClick={
              record.solver_status !== ScenarioCalculationStatusEnum.SUCCESS
                ? () => onCalcClick(record, 0)
                : undefined
            }
          >
            Full network
          </a>
        </Popconfirm>
      ),
      key: '0',
    },
    {
      label: (
        <Popconfirm
          title={`Recalculate "${record.name}" scenario?`}
          disabled={
            record.solver_status !== ScenarioCalculationStatusEnum.SUCCESS
          }
          onConfirm={() => onCalcClick(record, 1)}
        >
          <a
            href="#"
            onClick={
              record.solver_status !== ScenarioCalculationStatusEnum.SUCCESS
                ? () => onCalcClick(record, 1)
                : undefined
            }
          >
            Only buses with connections
          </a>
        </Popconfirm>
      ),
      key: '1',
    },
  ];

  useEffect(
    () => fetchConnectionScenariosList(),
    [
      currentNetworkId,
      pagination.current,
      pagination.pageSize,
      createdScenariosIds,
    ]
  );

  function fetchConnectionScenariosList() {
    if (!currentNetworkId) return;
    setLoading(true);

    ScenariosService.listConnectionScenarios({
      netId: currentNetworkId,
      limit: pagination.pageSize,
      offset: pagination.pageSize! * (pagination.current! - 1),
    })
      .then((res) => {
        setConnectionScenariosList(res.items);
        setPagination((prev) => ({ ...prev, total: res.count }));
      })
      .catch((e) => showMessage('error', e))
      .finally(() => setLoading(false));
  }

  function handleTableChange(pagination: TablePaginationConfig, filters: any) {
    setPagination((prev) => ({ ...prev, ...pagination }));
  }

  return (
    <Col>
      <SkeletonTable
        rowCount={8}
        active={true}
        loading={loading && !connectionScenariosList?.length}
        columns={allColumns.map((x) => ({ key: x.key }))}
      >
        <Table
          size="middle"
          loading={loading}
          columns={allColumns}
          dataSource={connectionScenariosList}
          rowKey="id"
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedRowKeys,
            onChange: onRowSelectionChange,
            getCheckboxProps: (record) => ({
              disabled:
                record.solver_status !==
                  ScenarioCalculationStatusEnum.SUCCESS &&
                !(
                  scenariosProgress.find((sp) => sp.scenario_id === record.id)
                    ?.state == ScenarioCalculationStatusEnum.SUCCESS
                ),
            }),
          }}
          rowClassName={(record) =>
            record.id && createdScenariosIds.includes(record.id)
              ? 'new-scenario'
              : ''
          }
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ y: 'calc(100vh - 220px)' }}
        />
      </SkeletonTable>
    </Col>
  );
};
