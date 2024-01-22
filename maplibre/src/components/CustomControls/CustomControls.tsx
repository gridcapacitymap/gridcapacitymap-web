import { Button, Checkbox, Drawer, Flex } from 'antd';
import { FC, useState } from 'react';
import geoJsonLayersConfig from '../../layerConfig/geojson_config.json';
import { LayerSpecification, Map } from 'maplibre-gl';
import { EyeOutlined } from '@ant-design/icons';

type Props = {
  map: Map | null;
};

export const CustomControls: FC<Props> = ({ map }) => {
  const [open, setOpen] = useState<boolean>(false);

  const layersSpecificationList = geoJsonLayersConfig as LayerSpecification[];

  return map ? (
    <>
      <Button
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
        }}
        onClick={() => setOpen(true)}
      >
        Layers
        <EyeOutlined />
      </Button>
      <Drawer
        title="Layers"
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        getContainer={false}
      >
        <Flex vertical gap="small">
          {layersSpecificationList.map((layer) => (
            <Checkbox
              defaultChecked={true}
              key={layer.id}
              onClick={(e) =>
                map.setLayoutProperty(
                  layer.id,
                  'visibility',
                  (e.target as HTMLInputElement).checked ? 'visible' : 'none'
                )
              }
            >
              {layer.id}
            </Checkbox>
          ))}
        </Flex>
      </Drawer>
    </>
  ) : null;
};
