import { FC, Key, useCallback, useEffect, useMemo, useState } from 'react';
import { Table, Col, Row, Space, TablePaginationConfig } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';

import {
  ColumnWithKeyType,
  IConnectionRequestStatus,
} from '../../helpers/interfaces';
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
  PaginatedResponse_ConnectionRequestApiSchema_,
} from '../../client';
import { CreateScenarioModal } from '../CreateScenarioModal';
import { showMessage } from '../../helpers/message';
import { ProjectIdColumn } from './components/ProjectIdColumn';
import { BusNumberColumn } from './components/BusNumberColumn';
import SkeletonTable from '../SkeletonTable';
import { FilterValue } from 'antd/es/table/interface';
import { useQuery } from '@tanstack/react-query';
import { useMainContext } from '../../hooks/useMainContext';

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
  const {
    busesGeojson,
    currentNetworkId,
    selectedConnectionRequests,
    setSelectedConnectionRequests,
    currentScenarioConnectionRequests,
  } = useMainContext();

  const [pagination, setPagination] =
    useState<TablePaginationConfig>(defaultPagination);
  const [filters, setFilters] =
    useState<ConnectionRequestsTableFilters>(defaultFilters);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const allColumns = useMemo(
    (): ColumnWithKeyType<ConnectionRequestApiSchema>[] => [
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
          busesGeojson.features
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
    [busesGeojson]
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

  const fetchConnectionRequests = useCallback(
    async (
      netId: string,
      pagination: TablePaginationConfig,
      filters: ConnectionRequestsTableFilters
    ): Promise<PaginatedResponse_ConnectionRequestApiSchema_> => {
      const offset =
        pagination.pageSize && pagination.current
          ? pagination.pageSize * (pagination.current - 1)
          : 0;

      return await ConnectionsService.getConnectionRequests({
        netId,
        limit: pagination.pageSize,
        offset,
        busId: filters[columnKeysEnum.busNumber],
        status: filters[columnKeysEnum.status],
        connectionKind: filters[columnKeysEnum.connectionKind],
        connectionEnergyKind: filters[columnKeysEnum.connectionType],
      });
    },
    []
  );

  const {
    isLoading,
    error,
    data: connectionRequests = [],
  } = useQuery({
    queryKey: [
      'paginatedConnectionRequests',
      filters,
      currentNetworkId,
      pagination.current,
      pagination.pageSize,
    ],
    queryFn: () =>
      fetchConnectionRequests(currentNetworkId!, pagination, filters).then(
        (res) => {
          setPagination((prev) => ({ ...prev, total: res.count }));
          return res.items;
        }
      ),
    enabled: Boolean(currentNetworkId),
  });

  useEffect(() => {
    error && showMessage('error', error);
  }, [error]);

  useEffect(() => {
    setSelectedRowKeys(selectedConnectionRequests.map((c) => c.id));
  }, [selectedConnectionRequests]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>
  ) => {
    setFilters((prev) => ({ ...prev, ...filters }));
    setPagination((prev) => ({ ...prev, ...pagination }));
  };

  const handleSelectionChange = (keys: Key[]) => {
    setSelectedConnectionRequests([
      ...selectedConnectionRequests.filter(
        (sc) => !connectionRequests.some((c) => c.id === sc.id)
      ),
      ...connectionRequests.filter(({ id }) => keys.includes(id)),
    ]);
  };

  const visibleColumns = allColumns.filter(
    ({ key }) => key && (showedColumnKeys as Key[]).includes(key)
  );

  const onShowedColumnKeysChange = (keys: Key[]) => {
    setShowedColumnKeys(
      keys.filter((k) =>
        (Object.values(columnKeysEnum) as Key[]).includes(k)
      ) as columnKeysEnum[]
    );
  };

  return (
    <Col>
      <Row justify="space-between" style={{ margin: '0 0 16px 0' }}>
        <Space align="center">
          <CreateScenarioModal />
        </Space>
        <ColumnsSettingModal
          allColumns={allColumns}
          setShowedColumnKeys={onShowedColumnKeysChange}
          showedColumnKeys={showedColumnKeys}
        />
      </Row>

      <SkeletonTable
        rowCount={8}
        active={true}
        loading={isLoading && !connectionRequests?.length}
        columns={visibleColumns.map((x) => ({ key: x.key }))}
      >
        <Table
          rowKey="id"
          loading={isLoading}
          columns={visibleColumns}
          dataSource={connectionRequests}
          size="small"
          footer={() => (
            <Footer
              selectedRequestQuantity={selectedConnectionRequests.length}
            />
          )}
          rowSelection={{
            type: 'checkbox',
            columnWidth: 50,
            onChange: handleSelectionChange,
            selectedRowKeys: selectedRowKeys,
            preserveSelectedRowKeys: true,
            getCheckboxProps: (record) => ({
              disabled: currentScenarioConnectionRequests.some(
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
