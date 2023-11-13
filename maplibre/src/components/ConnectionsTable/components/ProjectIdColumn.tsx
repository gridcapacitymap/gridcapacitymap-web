import { FC } from 'react';
import { Button } from 'antd';
import { ZoomInOutlined } from '@ant-design/icons';
import { showMessage } from '../../../helpers/message';
import { useMainContext } from '../../../context/MainContext';
import { ConnectionRequestApiSchema } from '../../../client';
import { LngLatLike } from 'maplibre-gl';

type Props = {
  projectId?: string;
  record: ConnectionRequestApiSchema;
};

export const ProjectIdColumn: FC<Props> = ({ projectId, record }) => {
  const mainContext = useMainContext();

  const zoomConnectionRequest = (record: ConnectionRequestApiSchema) => {
    if (record.extra?.wsg84lat && record.extra?.wsg84lon) {
      const requestCoordinates = [record.extra.wsg84lon, record.extra.wsg84lat];

      const connectivityBus = mainContext.busesGeoSource.data.features.find(
        (b) => b.properties.number === record.connectivity_node.id
      );

      const connectivityBusCoordinates = connectivityBus?.geometry.coordinates;

      const allBranchesFromConnectivityBusCoordinates =
        mainContext.branchesGeoSource.data.features
          .filter(
            (b) =>
              b.properties.from_bus.id === connectivityBus?.properties.id ||
              b.properties.to_bus.id === connectivityBus?.properties.id
          )
          .map((b) => {
            return [
              b.geometry.coordinates[0],
              b.geometry.coordinates[b.geometry.coordinates.length - 1],
            ];
          });

      const allTrafosBranchesFromConnectivityBusCoordinates =
        mainContext.trafoBranchesGeoSource.data.features
          .filter(
            (b) =>
              b.properties.from_bus.id === connectivityBus?.properties.id ||
              b.properties.to_bus.id === connectivityBus?.properties.id
          )
          .map((b) => {
            return [
              b.geometry.coordinates[0],
              b.geometry.coordinates[b.geometry.coordinates.length - 1],
            ];
          });

      mainContext.zoomToCoordinates([
        requestCoordinates as LngLatLike,
        connectivityBusCoordinates as LngLatLike,
        ...(allBranchesFromConnectivityBusCoordinates.flat() as LngLatLike[]),
        ...(allTrafosBranchesFromConnectivityBusCoordinates.flat() as LngLatLike[]),
      ]);
    } else {
      showMessage('warning', 'Invalid coordinates.');
    }
  };

  return (
    <>
      {projectId || ''}
      <Button
        type="text"
        size="small"
        onClick={() => zoomConnectionRequest(record)}
        icon={<ZoomInOutlined style={{ color: 'grey' }} />}
      />
    </>
  );
};
