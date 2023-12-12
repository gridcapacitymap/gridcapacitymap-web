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
import { parseFeaturesProperties } from '../../helpers/dataConverting';

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
      });
    }
  });

  useEffect(() => {
    if (mainContext.map) {
      const map = mainContext.map;

      map.loadImage(arrowImage, (error, image) => {
        if (error) throw error;
        image && map.addImage('arrow', image, { sdf: true });
      });

      map.loadImage(transformerImage, (error, image) => {
        if (error) throw error;
        image && map.addImage('transformer', image, { sdf: true });
      });

      map.addSource(ISourcesIdsEnum.connectionRequestsDensity, emptySource);
      map.addSource(ISourcesIdsEnum.connectionRequestsSourceId, emptySource);
      map.addSource(ISourcesIdsEnum.branchesSourceId, emptySource);
      map.addSource(ISourcesIdsEnum.busesSourceId, emptySource);
      map.addSource(ISourcesIdsEnum.trafosSourceId, emptySource);
      map.addSource(
        ISourcesIdsEnum.scenarioConnectionsLinesSourceId,
        emptySource
      );
      map.addSource(ISourcesIdsEnum.hexagonsConnectionRequest, emptySource);

      layersSpecificationList.forEach(
        (layer: maplibregl.LayerSpecification) => {
          map.addLayer(layer);
        }
      );

      const nav = new maplibregl.NavigationControl();
      map.addControl(nav, 'top-right');

      addLayersControl(
        map,
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
          map.on('click', layer.id, (event: maplibregl.MapLayerMouseEvent) => {
            const pickedFeatureProperties = parseFeaturesProperties(
              event.features?.[0]?.properties || {}
            );
            const pickedFeatureType = (layer.metadata as ILayerMetadata).type;

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
          });

          map.on('mouseenter', layer.id, () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          map.on('mouseleave', layer.id, () => {
            map.getCanvas().style.cursor = '';
          });
        });

      map.on('click', 'connection_requests_hexagonal_heatmap', (e) => {
        const geom = e.features?.[0].geometry;
        if (geom && 'coordinates' in geom && geom.coordinates) {
          const hexagonCoordinates = geom.coordinates[0];
          mainContext.setPickedHexagonCoordinates(
            hexagonCoordinates as [number, number][]
          );
        }
      });
    }

    // "layersSpecificationList" is data from json so useless as deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainContext.map]);

  return (
    <div
      ref={mapContainer as LegacyRef<HTMLDivElement>}
      id="map"
      style={{ height: '100%' }}
    />
  );
};
