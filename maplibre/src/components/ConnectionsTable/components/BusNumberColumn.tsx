import { FC } from 'react';
import { ConnectionRequestApiSchema } from '../../../client';
import { Button } from 'antd';
import { ZoomInOutlined } from '@ant-design/icons';
import { showMessage } from '../../../utils/message';
import { LngLatLike } from 'maplibre-gl';
import { useMainContext } from '../../../hooks/useMainContext';
import { zoomToCoordinates } from '../../../utils/map';

type Props = {
  busNumber?: string | number;
  record: ConnectionRequestApiSchema;
};

export const BusNumberColumn: FC<Props> = ({ busNumber, record }) => {
  const { map, busesGeojson } = useMainContext();

  const zoomBus = (record: ConnectionRequestApiSchema) => {
    const connectivityBusCoordinates = busesGeojson.features.find(
      (b) => b.properties.number === record.connectivity_node.id
    )?.geometry.coordinates;

    if (connectivityBusCoordinates) {
      zoomToCoordinates(map, [connectivityBusCoordinates as LngLatLike]);
    } else {
      showMessage('warning', 'Invalid coordinates.');
    }
  };

  return (
    <>
      {busNumber || ''}
      <Button
        type="text"
        size="small"
        onClick={() => zoomBus(record)}
        icon={<ZoomInOutlined style={{ color: 'grey' }} />}
      />
    </>
  );
};
