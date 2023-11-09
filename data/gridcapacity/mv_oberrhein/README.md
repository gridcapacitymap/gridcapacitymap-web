[MV Oberrhein](https://pandapower.readthedocs.io/en/v2.2.2/networks/mv_oberrhein.html) network with geodata for pandapower

This is a generic network assembled from openly available data supplemented with parameters based on experience.

Exported jsons are generated with gridcapacity docker image with command below

```
docker run -it --rm --name gridcapacity -w /app -v "$PWD":/app:Z gridcapacity/pandapower python dump_net_data.py
```

See https://github.com/gridcapacitymap/gridcapacity#usage-with-docker

Connection requests location randomization is recommended with setting of 200 meters from target connection points.
