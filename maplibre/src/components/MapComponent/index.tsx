import { useRef, useEffect, FC, LegacyRef } from 'react';
import maplibregl, { LayerSpecification } from 'maplibre-gl';

import {
  ILayerMetadata,
  ISourcesIdsEnum,
  PickedElementTypeEnum,
} from '../../helpers/interfaces';

import geoJsonLayersConfig from '../../layerConfig/geojson_config.json';

// maplibre requred images in sdf format to be able to color them
// https://stackoverflow.com/a/63314688
// convert transformer.png -filter Jinc -resize 400% -threshold 30% \( +clone -negate -morphology Distance Euclidean -level 50%,-50% \) -morphology Distance Euclidean -compose Plus -composite -level 45%,55% -resize 25% transformer_sdf.png
import arrowImage from '../../assets/arrow_sdf.png';
import transformerImage from '../../assets/transformer_sdf.png';

import { useMainContext } from '../../context/MainContext';

import { addLayersControl } from '../../helpers/controls';
import { emptySource } from '../../helpers/baseData';
import { parseFeaturesProperties } from '../../helpers/dataConvertation';

export const MapComponent: FC = () => {
  const mapContainer = useRef<HTMLElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mainContext = useMainContext();
  const layersSpecificationList: LayerSpecification[] =
    geoJsonLayersConfig as unknown as LayerSpecification[];

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,

      // Community Vector Tile Server (free for non-commercial use)
      // https://tile.ourmap.us/
      //
      // Alternatives
      // https://wiki.openstreetmap.org/wiki/Vector_tiles#Providers
      // https://github.com/openstreetmap/operations/issues/565
      // https://github.com/openmaptiles/fonts
      style: '/mapstyle.json',
      center: [0, 0],
      zoom: 1,
    });

    if (map?.current) {
      map.current.on('load', () => {
        mainContext.setMap(map.current);

        map.current!.loadImage(arrowImage, (error, image) => {
          if (error) throw error;
          image && map.current!.addImage('arrow', image, { sdf: true });
        });

        map.current!.loadImage(transformerImage, (error, image) => {
          if (error) throw error;
          image && map.current!.addImage('transformer', image, { sdf: true });
        });

        map.current!.addSource(
          ISourcesIdsEnum.connectionRequestsDensity,
          emptySource
        );
        map.current!.addSource(
          ISourcesIdsEnum.connectionRequestsSourceId,
          emptySource
        );
        map.current!.addSource(ISourcesIdsEnum.branchesSourceId, emptySource);
        map.current!.addSource(ISourcesIdsEnum.busesSourceId, emptySource);
        map.current!.addSource(ISourcesIdsEnum.trafosSourceId, emptySource);
        map.current!.addSource(
          ISourcesIdsEnum.scenarioConnectionsLinesSourceId,
          emptySource
        );
        map.current!.addSource(
          ISourcesIdsEnum.hexagonsConnectionRequest,
          emptySource
        );

        layersSpecificationList.forEach(
          (layer: maplibregl.LayerSpecification) => {
            map.current!.addLayer(layer);
          }
        );

        const nav = new maplibregl.NavigationControl();
        map.current!.addControl(nav, 'top-right');

        addLayersControl(
          map.current!,
          layersSpecificationList.map((layer) => layer.id)
        );

        layersSpecificationList
          .reduce(
            (
              layersWithPopup: maplibregl.LayerSpecification[],
              layer: maplibregl.LayerSpecification
            ) => {
              if (
                (layer.metadata as ILayerMetadata)?.showPopup &&
                (layer.metadata as ILayerMetadata)?.type
              ) {
                return [...layersWithPopup, layer];
              } else {
                return layersWithPopup;
              }
            },
            []
          )
          .forEach((layer) => {
            map.current!.on(
              'click',
              layer.id,
              (event: maplibregl.MapLayerMouseEvent) => {
                const pickedFeatureProperties = parseFeaturesProperties(
                  event.features?.[0]?.properties || {}
                );
                const pickedFeatureType = (layer.metadata as ILayerMetadata)
                  .type;

                if (
                  pickedFeatureProperties &&
                  Object.values(Object.keys(PickedElementTypeEnum)).includes(
                    pickedFeatureType
                  )
                ) {
                  mainContext.setPickedElement({
                    type: pickedFeatureType,
                    properties: pickedFeatureProperties,
                  });
                }
              }
            );

            map.current!.on(
              'mouseenter',
              layer.id,
              (event: maplibregl.MapLayerMouseEvent) => {
                (map.current as maplibregl.Map).getCanvas().style.cursor =
                  'pointer';
              }
            );

            map.current!.on('mouseleave', layer.id, () => {
              (map.current as maplibregl.Map).getCanvas().style.cursor = '';
            });
          });

        map.current!.on(
          'click',
          'connection_requests_hexagonal_heatmap',
          (e) => {
            const hexagonCoordinates = (e.features?.[0].geometry as any)
              .coordinates[0] as [number, number][];
            hexagonCoordinates &&
              mainContext.setPickedHexagonCoordinates(hexagonCoordinates);
          }
        );
      });
    }
  });

  return (
    <div
      ref={mapContainer as LegacyRef<HTMLDivElement>}
      id="map"
      style={{ height: '100%' }}
    />
  );
};
