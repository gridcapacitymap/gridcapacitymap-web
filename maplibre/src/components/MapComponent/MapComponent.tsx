import { useRef, useEffect, FC, LegacyRef, useState } from 'react';
import maplibregl, { LayerSpecification } from 'maplibre-gl';

import {
  ILayerMetadata,
  SourcesIdsEnum,
  PickedElementTypeEnum,
  AnyObject,
} from '../../helpers/interfaces';

import geoJsonLayersConfig from '../../layerConfig/geojson_config.json';

// maplibre requred images in sdf format to be able to color them
// https://stackoverflow.com/a/63314688
// convert transformer.png -filter Jinc -resize 400% -threshold 30% \( +clone -negate -morphology Distance Euclidean -level 50%,-50% \) -morphology Distance Euclidean -compose Plus -composite -level 45%,55% -resize 25% transformer_sdf.png
import arrowImage from '../../assets/arrow_sdf.png';
import transformerImage from '../../assets/transformer_sdf.png';

import { emptySource } from '../../helpers/baseData';
import { parseFeaturesProperties } from '../../helpers/dataConverting';
import { useMainContext } from '../../hooks/useMainContext';
import { LayersEnum } from '../../types/map';
import { CustomControls } from '../CustomControls';

export const MapComponent: FC = () => {
  const {
    setMap: setMapToContext,
    setPickedElement,
    setPickedHexagonId,
  } = useMainContext();

  const layersSpecificationList = geoJsonLayersConfig as LayerSpecification[];

  const mapContainerRef = useRef<HTMLElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map || !mapContainerRef.current) return;

    setMap(
      new maplibregl.Map({
        container: mapContainerRef.current,

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
      })
    );
  });

  useEffect(() => {
    if (map) {
      map.on('load', () => {
        map.loadImage(arrowImage, (error, image) => {
          if (error) throw error;
          image && map.addImage('arrow', image, { sdf: true });
        });

        map.loadImage(transformerImage, (error, image) => {
          if (error) throw error;
          image && map.addImage('transformer', image, { sdf: true });
        });

        map.addSource(SourcesIdsEnum.connectionRequestsDensity, emptySource);
        map.addSource(SourcesIdsEnum.connectionRequestsSourceId, emptySource);
        map.addSource(SourcesIdsEnum.branchesSourceId, emptySource);
        map.addSource(SourcesIdsEnum.busesSourceId, emptySource);
        map.addSource(SourcesIdsEnum.trafosSourceId, emptySource);
        map.addSource(
          SourcesIdsEnum.scenarioConnectionsLinesSourceId,
          emptySource
        );
        map.addSource(SourcesIdsEnum.hexagonsConnectionRequest, emptySource);

        layersSpecificationList.forEach((layer) => {
          map.addLayer(layer);
        });

        Object.values(LayersEnum).forEach((layerId) => {
          map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
          });
        });

        const nav = new maplibregl.NavigationControl();
        map.addControl(nav, 'top-right');

        map.on('click', LayersEnum.connectionRequestsHexagonalHeatmap, (e) => {
          const feat = e.features?.[0] as any;
          if (feat?.properties?.id) {
            setPickedHexagonId(feat?.properties?.id);
          }
        });

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
        });

        map.on('mouseenter', LayersEnum.hexagonsConnectionRequests, (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: [LayersEnum.hexagonsConnectionRequests],
          });
          if (features[0]) {
            const coordinates = (
              features[0].geometry as AnyObject
            ).coordinates.slice();

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            popup
              .setLngLat(coordinates)
              .setHTML(
                `
                <div style="font-size: 1.5em;">
                  <b>${features[0].properties.project_id}</b>
                </div>
                <hr/>
                <div style="color: grey;">${features[0].properties.connection_energy_kind}</div>
                <div style="font-size: 1.5em;">${features[0].properties.power_increase} MW</div>
              `
              )
              .addTo(map);
          }
        });

        map.on('mouseleave', LayersEnum.hexagonsConnectionRequests, () =>
          popup.remove()
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
            map.on(
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
                  setPickedElement({
                    type: pickedFeatureType,
                    properties: pickedFeatureProperties,
                  });
                }
              }
            );
          });

        setMapToContext(map);
      });
    }
  }, [map]);

  return (
    <>
      <div
        ref={mapContainerRef as LegacyRef<HTMLDivElement>}
        id="map"
        style={{ height: '100%' }}
      />
      <CustomControls map={map} />
    </>
  );
};
