# Self-hosted map tiles guide

## Step 1. Build tilemaker release

```
cd ~/Downloads
git clone git@github.com:systemed/tilemaker.git
cd tilemaker
git checkout v2.4.0
docker build -t tilemaker .
```

## Step 2. Download OSM data

```
cd ~/Downloads
mkdir tmp && cd tmp

# coastline
wget https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip
unzip water-polygons-split-4326.zip
mv water-polygons-split-4326 coastline

# Sweden as an example
wget https://download.geofabrik.de/europe/sweden-latest.osm.pbf
```

## Step 3. Build mbtiles

```
mkdir mbtiles
docker run -v $HOME/Downloads/tmp/coastline:/coastline:Z  -v $HOME/Downloads/tmp:/srv:Z -it --rm tilemaker --input /srv/sweden-latest.osm.pbf --output=/srv/mbtiles/sweden-latest.mbtiles
```

## Step 4. Start tile server

```
docker run --rm -it -v $HOME/Downloads/tmp/mbtiles:/data:Z -p 8080:8080 maptiler/tileserver-gl
```

Open [localhost:8080](http://localhost:8080) in browser.

## References
- https://github.com/systemed/tilemaker/tree/master
- https://wiki.openstreetmap.org/wiki/Planet.osm#Extracts
- https://download.geofabrik.de/
- https://blog.kleunen.nl/blog/tilemaker-generate-map
