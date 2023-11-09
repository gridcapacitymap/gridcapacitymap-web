// skeleton-table.tsx

import { Skeleton, SkeletonProps, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';

export type SkeletonTableColumnsType = {
  key: string;
};

type SkeletonTableProps = SkeletonProps & {
  columns: ColumnsType<SkeletonTableColumnsType>;
  rowCount?: number;
};

export default function SkeletonTable({
  loading = false,
  active = false,
  rowCount = 5,
  columns,
  children,
  className,
}: SkeletonTableProps): JSX.Element {
  return loading ? (
    <Table
      rowKey="key"
      pagination={false}
      dataSource={[...Array(rowCount)].map((_, index) => ({
        key: `key${index}`,
      }))}
      columns={columns.map((column) => {
        return {
          ...column,
          render: function renderPlaceholder() {
            return (
              <Skeleton
                key={column.key}
                title
                active={active}
                paragraph={false}
                className={className}
              />
            );
          },
        };
      })}
    />
  ) : (
    <>{children}</>
  );
}
