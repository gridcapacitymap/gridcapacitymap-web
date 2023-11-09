import json
import os

import pandapower as pp
import pandapower.plotting as plt
import pandapower.plotting.geo as geo
from pandapower.converter import from_cim as cim2pp

# https://github.com/e2nIEE/pandapower/blob/develop/tutorials/cim2pp.ipynb
# folder_path points to the directory where the CIM .zip-Files are stored:


folder_path = os.path.join(os.getcwd(), "example_cim")

# cgmes_files is a list containing paths to both files needed for the CIM converter:
cgmes_files = [
    os.path.join(
        folder_path, "CGMES_v2.4.15_SmallGridTestConfiguration_Boundary_v3.0.0.zip"
    ),
    os.path.join(
        folder_path,
        # "CGMES_v2.4.15_SmallGridTestConfiguration_BaseCase_Complete_v3.0.0.zip",
        "CGMES_v2.4.15_SmallGridTestConfiguration_ReducedNetwork_Complete_v3.0.0.zip",
    ),
]

for f in cgmes_files:
    if not os.path.exists(f):
        raise UserWarning(f"Wrong path specified for the CGMES file {f}")

net = cim2pp.from_cim(file_list=cgmes_files, use_GL_or_DL_profile="GL")

pp.to_json(net, "cim_cgmes.json")
print("Conversion successful")


# -------------------------------
# -------- EXPORT GEODATA -------
# -------------------------------
case_name = "example_cim.json"  # non existent!
pp.plotting.plotly.geo_data_to_latlong(net, "epsg:4326")

geo.convert_geodata_to_gis(net)


# line geodata
# https://geopandas.org/en/stable/docs/reference/api/geopandas.GeoDataFrame.html
typ = "branch"

# https://pandapower.readthedocs.io/en/v2.13.1/plotting/matplotlib/generic.html
# pp.plotting.create_generic_coordinates(
#     net, geodata_table="line_geodata", overwrite=True
# )

line_geojson_str = net.line_geodata.to_json()

line_geojson = json.loads(line_geojson_str)

all_features = []

for feat in line_geojson["features"]:
    i = int(feat["id"])

    from_bus_index = net.line.from_bus[i]
    to_bus_index = net.line.to_bus[i]

    feat["properties"] = {
        "typ": typ,
        "from_number": net.bus.name.iat[from_bus_index],
        "to_number": net.bus.name.iat[to_bus_index],
    }
    all_features.append(feat)


# bus geodata
typ = "bus"
bus_geojson_str = net.bus_geodata.to_json()
bus_geojson = json.loads(bus_geojson_str)

for feat in bus_geojson["features"]:
    i = int(feat["id"])

    feat["properties"] = {
        "typ": typ,
        "number": net.bus.name.iat[i],
    }
    all_features.append(feat)

exported_geojson_fname = case_name.replace(".json", f"_geodata.json")
with open(exported_geojson_fname, "w") as f:
    d = {"type": "FeatureCollection", "features": all_features}
    json.dump(d, f)

# -------------------------------
# ------ EXPORT SUBSYSTEMS ------
# -------------------------------

# violations can occur on trafos, lines, buses
# therefore no need to visualize other subsystems on the map
# also only these 3 subsystem types have geospatial data

subsystems_path = "mv_oberrhein_exported_data"
subsystems = {
    "buses": [],
    "branches": [],
    "trafos": [],
    "trafos3w": [],
    "loads": [],
    "gens": [],
    # 'loads': net.load.to_dict(orient='records'),
    # 'gens': net.gen.to_dict(orient='records'),
    # 'ext_grid': net.ext_grid.to_dict(orient='records'),
}

buses = net.bus.to_dict(orient="index")
# pandapower mapping
# bus_type = {'b': "busbar", 'n': "node", "m": "muff"}
#
# psse mapping
# Type 1: Load Bus
# Type 2: Generator Bus
# Type 3: Swing Bus

for index, bus in buses.items():
    subsystems["buses"].append(
        {
            "number": bus["name"],
            "name": bus["name"],
            # TODO ensure correct mapping
            "bus_type": ["b", "n", "m"].index(bus["type"]) + 1,
            "zone_name": bus["zone"],
            "base_kv": bus["vn_kv"],
            "voltage_pu": 1,
            "actual_load_mva": [0, 0],
            "actual_gen_mva": [0, 0],
            "in_service": bus["in_service"],
        }
    )

branches = net.line.to_dict(orient="index")
for index, br in branches.items():
    from_bus_index = br["from_bus"]
    to_bus_index = br["to_bus"]

    subsystems["branches"].append(
        {
            "index": index,
            "from_number": net.bus.name.iat[from_bus_index],
            "to_number": net.bus.name.iat[to_bus_index],
            "name": br["name"],
            "bus_type": 1 if br["type"] == "b" else 0,
            "in_service": br["in_service"],
            "branch_id": str(br["parallel"]),
        }
    )

trafos = net.trafo.to_dict(orient="index")
for index, tr in trafos.items():
    start = tr["hv_bus"] if tr["tap_side"] == "hv" else tr["lv_bus"]
    end = tr["lv_bus"] if tr["tap_side"] == "hv" else tr["hv_bus"]

    subsystems["trafos"].append(
        {
            "from_number": net.bus.name.iat[start],
            "to_number": net.bus.name.iat[end],
            "name": tr["name"],
            "in_service": tr["in_service"],
            "trafo_id": str(tr["parallel"]),
        }
    )

exported_net_fname = case_name.replace(".json", "_exported_data.json")
with open(exported_net_fname, "w") as f:
    json.dump(subsystems, f)

print("Export has been completed")
