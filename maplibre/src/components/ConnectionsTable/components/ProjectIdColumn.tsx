import { FC } from 'react';
import { Button } from 'antd';
import { ZoomInOutlined } from '@ant-design/icons';
import { showMessage } from '../../../utils/message';
import { ConnectionRequestApiSchema } from '../../../client';
import { LngLatLike } from 'maplibre-gl';
import { useMainContext } from '../../../hooks/useMainContext';
import { zoomToCoordinates } from '../../../utils/map';

type Props = {
  projectId?: string;
  record: ConnectionRequestApiSchema;
};

export const ProjectIdColumn: FC<Props> = ({ projectId, record }) => {
  const { map, busesGeojson, branchesGeojson, trafoBranchesGeojson } =
    useMainContext();

  const zoomConnectionRequest = (record: ConnectionRequestApiSchema) => {
    if (record.extra?.wsg84lat && record.extra?.wsg84lon) {
      const requestCoordinates = [record.extra.wsg84lon, record.extra.wsg84lat];

      const connectivityBus = busesGeojson.features.find(
        (b) => b.properties.number === record.connectivity_node.id
      );

      const connectivityBusCoordinates = connectivityBus?.geometry.coordinates;

      const allBranchesFromConnectivityBusCoordinates = branchesGeojson.features
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
        trafoBranchesGeojson.features
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

      zoomToCoordinates(map, [
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
