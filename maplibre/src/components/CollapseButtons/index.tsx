import { CSSProperties, FC, useEffect, useState } from 'react';
import { Radio } from 'antd';
import {
  MenuFoldOutlined,
  PicLeftOutlined,
  PicCenterOutlined,
} from '@ant-design/icons';
import { isMobile } from '../../helpers/checkups';

export type LayoutSize = 0 | 12 | 24;
export type TwoColLayout = [LayoutSize, LayoutSize];

const ButtonStyle: CSSProperties = {
  borderRadius: 0,
  backgroundColor: 'transparent',
};

interface IProps {
  initialSize: TwoColLayout;
  onLayoutChange: React.Dispatch<React.SetStateAction<TwoColLayout>>;
}

export const CollapseButtons: FC<IProps> = ({
  initialSize,
  onLayoutChange,
}) => {
  const [layoutSizeState, setLayoutSizeState] =
    useState<TwoColLayout>(initialSize);

  useEffect(() => {
    const [left] = layoutSizeState;

    switch (left) {
      case 0:
        onLayoutChange([0, 24]);
        break;
      case 24:
        onLayoutChange([24, 0]);
        break;
      case 12:
        onLayoutChange([12, 12]);
        break;
    }
    // disable warning about missing dependency onLayoutChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutSizeState]);

  return (
    <Radio.Group
      size={isMobile ? 'middle' : 'small'}
      value={layoutSizeState[0]}
      onChange={(e) => {
        const l = parseInt(e.target.value);
        const w = layoutSizeState[0] + layoutSizeState[1];
        return setLayoutSizeState([l, w - l] as TwoColLayout);
      }}
    >
      <Radio.Button style={ButtonStyle} value={0}>
        <MenuFoldOutlined />
      </Radio.Button>

      {isMobile || (
        <Radio.Button style={ButtonStyle} value={12}>
          <PicLeftOutlined />
        </Radio.Button>
      )}

      <Radio.Button style={ButtonStyle} value={24}>
        <PicCenterOutlined />
      </Radio.Button>
    </Radio.Group>
  );
};
