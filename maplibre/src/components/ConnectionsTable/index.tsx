import { FC, Key, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Col,
  Row,
  TableColumnsType,
  Space,
  TablePaginationConfig,
} from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';

import { useMainContext } from '../../context/MainContext';
import { IConnectionRequestStatus } from '../../helpers/interfaces';
import { Footer } from './components/Footer';
import { ColumnsSettingModal } from '../ColumnsSettingModal';
import { ExpandedRow } from './components/ExpandedRow';
import {
  ConnectionEnergyKindEnum,
  ConnectionKindEnum,
  ConnectionRequestApiSchema,
  ConnectionStatusEnum,
  ConnectionsService,
  GeoFeature_PointGeometry_,
} from '../../client';
import { CreateScenarioModal } from '../CreateScenarioModal';
import { showMessage } from '../../helpers/message';
import { ProjectIdColumn } from './components/ProjectIdColumn';
import { BusNumberColumn } from './components/BusNumberColumn';
import SkeletonTable from '../SkeletonTable';

enum columnKeysEnum {
  projectId = 'projectId',
  busNumber = 'busId',
  organization = 'organization',
  connectionKind = 'connectionKind',
  powerTotal = 'powerTotal',
  status = 'status',
  connectionType = 'connectionType',
  powerIncrease = 'powerIncrease',
}

const defaultPagination: TablePaginationConfig = {
  showSizeChanger: true,
  pageSizeOptions: [100, 200, 500],
  defaultPageSize: 100,
  pageSize: 100,
  defaultCurrent: 1,
  current: 1,
};

interface ConnectionRequestsTableFilters {
  [columnKeysEnum.busNumber]: string[];
  [columnKeysEnum.status]: ConnectionStatusEnum | null;
  [columnKeysEnum.connectionKind]: ConnectionKindEnum | null;
  [columnKeysEnum.connectionType]: ConnectionEnergyKindEnum | null;
}

const defaultFilters: ConnectionRequestsTableFilters = {
  [columnKeysEnum.busNumber]: [],
  [columnKeysEnum.status]: null,
  [columnKeysEnum.connectionKind]: null,
  [columnKeysEnum.connectionType]: null,
};

export const ConnectionsTable: FC = () => {
  const mainContext = useMainContext();

  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] =
    useState<TablePaginationConfig>(defaultPagination);
  const [filters, setFilters] =
    useState<ConnectionRequestsTableFilters>(defaultFilters);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequestApiSchema[]
  >([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const allColumns = useMemo(
    (): TableColumnsType<ConnectionRequestApiSchema> => [
      {
        key: columnKeysEnum.projectId,
        title: 'Project',
        dataIndex: 'project_id',
        colSpan: 1,
        render: (value, record) => (
          <ProjectIdColumn projectId={value} record={record} />
        ),
      },
      {
        key: columnKeysEnum.busNumber,
        title: 'Bus',
        dataIndex: ['connectivity_node', 'id'],
        align: 'right',
        filters:
          mainContext.busesGeoSource.data.features
            .filter((b: GeoFeature_PointGeometry_) => b.properties.number)
            .map((b: GeoFeature_PointGeometry_) => ({
              text: b.properties.number,
              value: b.properties.id,
            })) || [],
        filterSearch: (input, record) =>
          (record.text as string).toLowerCase().includes(input.toLowerCase()),
        render: (value, record) => (
          <BusNumberColumn busNumber={value} record={record} />
        ),
      },
      {
        key: columnKeysEnum.organization,
        title: 'Organization',
        dataIndex: ['organization', 'name'],
      },
      {
        key: columnKeysEnum.connectionKind,
        title: 'Case Type',
        dataIndex: 'connection_kind',
        filters: Object.values(ConnectionKindEnum).map((k) => ({
          value: k,
          text: k,
        })),
        filterMultiple: false,
      },
      {
        key: columnKeysEnum.powerTotal,
        title: 'Total (MW)',
        dataIndex: 'power_total',
        align: 'right',
      },
      {
        key: columnKeysEnum.status,
        title: 'Status',
        dataIndex: 'status',
        filters: [
          ...Object.keys(IConnectionRequestStatus).map((status) => ({
            text: status,
            value: status,
          })),
        ],
        filterMultiple: false,
      },
      {
        key: columnKeysEnum.connectionType,
        title: 'Type',
        dataIndex: 'connection_energy_kind',
      },
      {
        key: columnKeysEnum.powerIncrease,
        title: 'Increase (MW)',
        dataIndex: 'power_increase',
        align: 'right',
      },
    ],
    [mainContext.busesGeoSource]
  );

  const defaultHiddenColumns = [
    columnKeysEnum.powerTotal,
    columnKeysEnum.organization,
  ];
  const defaultColumns = Object.values(columnKeysEnum).filter(
    (x) => !defaultHiddenColumns.includes(x)
  );
  const [showedColumnKeys, setShowedColumnKeys] =
    useState<columnKeysEnum[]>(defaultColumns);

  useEffect(
    () => fetchConnectionRequests(),
    [
      mainContext.currentNetworkId,
      pagination.current,
      pagination.pageSize,
      filters,
    ]
  );

  useEffect(() => {
    setSelectedRowKeys(
      mainContext.selectedConnectionRequestsUnified.map((c) => c.id)
    );
  }, [mainContext.selectedConnectionRequestsUnified]);

  function fetchConnectionRequests() {
    if (!mainContext.currentNetworkId) return;
    setLoading(true);

    ConnectionsService.getConnectionRequests({
      netId: mainContext.currentNetworkId,
      limit: pagination.pageSize,
      offset: pagination.pageSize! * (pagination.current! - 1),
      busId: filters[columnKeysEnum.busNumber],
      status: filters[columnKeysEnum.status],
      connectionKind: filters[columnKeysEnum.connectionKind],
      connectionEnergyKind: filters[columnKeysEnum.connectionType],
    })
      .then((res) => {
        setConnectionRequests(res.items);
        setPagination((prev) => ({ ...prev, total: res.count }));
      })
      .catch((e) => showMessage('error', e))
      .finally(() => setLoading(false));
  }

  function handleTableChange(pagination: TablePaginationConfig, filters: any) {
    setFilters((prev) => ({ ...prev, ...filters }));
    setPagination((prev) => ({ ...prev, ...pagination }));
  }

  function handleSelectionChange(keys: Key[]) {
    mainContext.setSelectedConnectionRequestsUnified([
      ...mainContext.selectedConnectionRequestsUnified.filter(
        (sc) => !connectionRequests.some((c) => c.id === sc.id)
      ),
      ...connectionRequests.filter(({ id }) => keys.includes(id)),
    ]);
  }

  const visibleColumns = allColumns.filter(
    ({ key }) => key && (showedColumnKeys as Key[]).includes(key)
  );

  return (
    <Col>
      <Row justify="space-between" style={{ margin: '0 0 16px 0' }}>
        <Space align="center">
          <CreateScenarioModal />
        </Space>
        <ColumnsSettingModal
          allColumns={allColumns}
          setShowedColumnKeys={setShowedColumnKeys}
          showedColumnKeys={showedColumnKeys}
        />
      </Row>

      <SkeletonTable
        rowCount={8}
        active={true}
        loading={loading && !connectionRequests?.length}
        columns={visibleColumns.map((x) => ({ key: x.key }))}
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={visibleColumns}
          dataSource={connectionRequests}
          size="small"
          footer={() => (
            <Footer
              selectedRequestQuantity={
                mainContext.selectedConnectionRequestsUnified.length
              }
            />
          )}
          rowSelection={{
            type: 'checkbox',
            columnWidth: 50,
            onChange: handleSelectionChange,
            selectedRowKeys: selectedRowKeys,
            preserveSelectedRowKeys: true,
            getCheckboxProps: (record) => ({
              disabled:
                mainContext.currentScenarioConnectionRequestsUnified.some(
                  (c) => c.id === record.id
                ),
            }),
          }}
          expandable={{
            columnWidth: 40,
            expandIcon: ({ expanded, onExpand, record }) =>
              expanded ? (
                <UpOutlined onClick={(e) => onExpand(record, e)} />
              ) : (
                <DownOutlined onClick={(e) => onExpand(record, e)} />
              ),
            expandedRowRender: (record) => <ExpandedRow record={record} />,
          }}
          pagination={pagination}
          scroll={{ y: 'calc(100vh - 320px)' }}
          onChange={handleTableChange}
        />
      </SkeletonTable>
    </Col>
  );
};
