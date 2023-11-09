import { FC } from 'react';
import { ConnectionRequestUnified } from '../../../client';
import { Button } from 'antd';
import { ZoomInOutlined } from '@ant-design/icons';
import { useMainContext } from '../../../context/MainContext';
import { showMessage } from '../../../helpers/message';
import { LngLatLike } from 'maplibre-gl';

type Props = {
  busNumber?: string | number;
  record: ConnectionRequestUnified;
};

export const BusNumberColumn: FC<Props> = ({ busNumber, record }) => {
  const mainContext = useMainContext();

  const zoomBus = (record: ConnectionRequestUnified) => {
    const connectivityBusCoordinates =
      mainContext.busesGeoSource.data.features.find(
        (b) => b.properties.number === record.connectivity_node.id
      )?.geometry.coordinates;

    if (connectivityBusCoordinates) {
      mainContext.zoomToCoordinates([connectivityBusCoordinates as LngLatLike]);
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
