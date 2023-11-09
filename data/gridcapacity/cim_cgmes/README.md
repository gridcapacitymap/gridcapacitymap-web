```
# export subsystems data (incl. geodata)
docker run -it --rm --name gridcapacity -w /app -v "$PWD":/app:Z gridcapacity/pandapower python dump_net_data.py

# calculate base case headroom
docker run -it --rm --name gridcapacity -w /app -v "$PWD":/app:Z gridcapacity/pandapower python -m gridcapacity /app/cim_cgmes_config.json
```

## Gridcapacity dockerised

https://github.com/gridcapacitymap/gridcapacity#usage-with-docker

## pandapower converters

https://pandapower.readthedocs.io/en/v2.13.1/converter/cgmes.html
https://github.com/e2nIEE/pandapower/blob/develop/tutorials/cim2pp.ipynb

## test cases sourced from

https://github.com/e2nIEE/pandapower/issues/278
https://www.powsybl.org/pages/documentation/grid/formats/cim-cgmes.html

https://github.com/e2nIEE/pandapower/issues/1909
