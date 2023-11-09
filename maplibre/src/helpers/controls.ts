const svgLayersIconString = `
  <svg width="29px" height="29px" viewBox="-2 -2 28 28" fill="none">
    <path id="Vector" d="M21 12L12 18L3 12M21 16L12 22L3 16M21 8L12 14L3 8L12 2L21 8Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

export const addLayersControl = (map: maplibregl.Map, layersIds: string[]) => {
  const LayersControl = {
    onAdd() {
      const layerControlMenu = document.createElement('div');
      layerControlMenu.classList.add('d-none', 'layers-control-menu');
      layersIds.map((layerId) => {
        const checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.setAttribute('checked', 'true');
        checkbox.onclick = (e) => {
          map.setLayoutProperty(
            layerId,
            'visibility',
            (e.target as HTMLInputElement).checked ? 'visible' : 'none'
          );
        };

        const placeholder = document.createElement('span');
        placeholder.innerText = map.getLayer(layerId)?.id || 'none';

        const wrapper = document.createElement('div');
        wrapper.appendChild(checkbox);
        wrapper.appendChild(placeholder);

        layerControlMenu.appendChild(wrapper);
      });
      document.body.appendChild(layerControlMenu);

      const iconSpan = document.createElement('span');
      iconSpan.className = 'maplibregl-ctrl-icon';
      iconSpan.innerHTML = svgLayersIconString;

      const ctrlBtn = document.createElement('button');
      ctrlBtn.appendChild(iconSpan);

      const ctrlNode = document.createElement('div');
      ctrlNode.id = 'ctrl-layers';
      ctrlNode.onclick = () => {
        layerControlMenu.classList.toggle('d-none');
      };
      // next classes from maplibre-gl
      ctrlNode.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      ctrlNode.appendChild(ctrlBtn);
      return ctrlNode;
    },

    onRemove() {
      document.getElementById('ctrl-layers')?.remove();
    },
  };

  map.addControl(LayersControl, 'top-right');
};
