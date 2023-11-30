import json
import logging
import os
from collections import defaultdict
from datetime import date, datetime
from typing import Any, Callable, Dict, Optional

import jsonschema
import pandas as pd
from numpy import isnan
from sweref99 import projections

COUNTRY = os.environ.get("COUNTRY", "ISL")

DATA_DIR = os.environ.get("DATA_DIR", "/app/static")
MODEL_DIR = os.environ.get("MODEL_DIR", "/app/static")

jsonschema_path = os.path.join(MODEL_DIR, "GridConnectionRequest.schema.json")

admin_geo_lookup_csv = os.path.join(DATA_DIR, "shape", COUNTRY, COUNTRY + "_adm2.csv")

tm = projections.make_transverse_mercator("SWEREF_99_TM")

logger = logging.getLogger(__name__)


def _normalize_coords(coords: Dict[str, float], *args, **kw):
    n, e, rlat, rlon = (
        coords.get("sweref99tmNorthing", None),
        coords.get("sweref99tmEasting", None),
        coords.get("wsg84lat", None),
        coords.get("wsg84lon", None),
    )

    if rlon and rlat:
        n, e = tm.geodetic_to_grid(rlat, rlon)
    elif n and e:
        rlat, rlon = tm.grid_to_geodetic(int(n), int(e))
    else:
        logger.error(f"cannot detect coordinates from ({coords})")
        n, e, rlat, rlon = 0, 0, 0, 0

    return {
        "sweref99tmNorthing": n,
        "sweref99tmEasting": e,
        "wsg84lat": rlat,
        "wsg84lon": rlon,
    }


def json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} is not serializable {obj}")


def load_json(path):
    """This function loads the given schema available"""
    with open(path, "r") as fh:
        data = json.load(fh)
    return data


class ConnectionRequestsImporter:
    normalize_coords: Callable

    def __init__(self, normalize_coords: Optional[Callable] = None) -> None:
        if callable(normalize_coords):
            self.normalize_coords = normalize_coords
        else:
            self.normalize_coords = _normalize_coords

    def load_conn_req_sheet(self, xlsx_input_path: str):
        # Read XLSX file to dataframe

        df: Any = pd.read_excel(
            xlsx_input_path, sheet_name=0, header=2, parse_dates=True
        )

        # DataFrame from Spreadsheet
        # df = sheet.to_pandas()

        # Map excel columns to model
        # Rename excel headers, columns started from **excluded** removed

        columns_map = {
            "Datum Förfrågan": "createdDateTime",
            "Önskat anslutnings-datum": "dateDesired",
            "Projektets namn": "id",
            "Kund": "organization.name",
            "Kommun": "adminGeo_level2_name",
            "Område": "internalGeo.level1_code",
            "Kapacitetsbrist- område Ja/Nej": "extra.capacityLimitedArea",
            "Effekt Total": "powerTotal",
            "Effekt höjning": "powerIncrease",
            "Nätanalytiker": "gridAnalyst.fullName",
            "Kundansvarig RN": "accountManager.fullName",
            "Avtalsfas": "status",
            "Orsak till att kund avböjde": "extra.reasonCustomerDeclined",
            "Anslutningspunkt": "connectivityNode.id",
            "Länk till svar anslutningsmöjlighet": "extra.linkToPsseCalculations",
            "SvK anslutningsprocess": "extra.nationalTransmissionGridConnectionProcess",
            # Koordinaterna (x, y eller N, E)
            "X": "extra.sweref99tmNorthing",
            # Koordinaterna (x, y eller N, E)
            "Y": "extra.sweref99tmEasting",
            "Ärendetyp Nivå 1": "connectionKind",
            "Ärendetyp Nivå 2": "connectionEnergyKind",
            "Kundtyp Nivå 3": "customerKind",
            "Kundtyp Nivå 4": "industryKind",
            "För Energilager m.fl. Inmatningseffekt": "extra.inputPower",
            "Datum för Reservationsavtal": "date_reservation_agreement",
            "Datum för Resevationsavtal": "date_reservation_agreement",
            "Datum för Projekteringsavtal": "date_planning_agreement",
            "Datum för anslutningsavtal": "date_connection_agreement",
            "Datum för Nätavtal": "date_network_aggreement",
            "Datum då kund avböjde": "date_customerDeclined",
        }

        # 'Kategori': 'exclude04',
        # 'Region': 'exclude18',
        # 'Typ': 'exclude05',
        # 'Lastflytt Skriv stationen i kommentarer': 'exclude19',
        # 'Kvittens av effekthöjning': 'exclude20',
        # 'Registrerad i OPA': 'exclude06',
        # 'Nya regler': 'exclude07',
        # 'Gamla Regler': 'exclude08',
        # 'N/A': 'exclude09',
        # 'Anslutningsavgift Motivering': 'exclude01',
        # 'Länk till senaste Avtal2': 'exclude02',
        # 'Aktiv köplats': 'exclude27',
        # 'Offert förfaller': 'exclude21',
        # 'Datum köplats': 'exclude22',
        # 'Stamnätsstation(-er)': 'exclude10',
        # 'Flaskhals': 'exclude11',
        # 'Datum för svar anslutningsmöjlighet': 'exclude12',
        # 'Datum SvK förfrågan': 'exclude23',
        # 'Länk till förhandsbesked': 'exclude24',
        # 'Länk till svar tids & prisindikation': 'exclude28',
        # 'Kolumn1': 'exclude03',
        # 'Avtalssteg': 'exclude25',
        # 'Positivt förhandsbesked': 'exclude26',
        # 'Länk till Reservationsavtal': 'exclude13',
        # 'Länk till Anslutningsavtal': 'exclude15',
        # 'Bedömd anslutningsdatum (använd när kundens anslutningstidpunkt är orimlig)': 'exclude17',
        # 'Länk till Projekteringsavtal': 'exclude14',
        # 'Länk till Nätavtal': 'exclude16',

        def mapp(v):
            x = v.replace("\n", " ")
            x = " ".join(x.split())
            return columns_map.get(x, x)

        # rename
        df = df.rename(columns=mapp)

        # exclude
        exclude_cols = list(df) - columns_map.keys() - set(columns_map.values())
        df = df.drop(columns=exclude_cols, axis=1, errors="ignore")  # type: ignore

        # remove columns labeled for exclusion
        df = df.drop(
            labels=[v for v in columns_map.values() if v.startswith("exclude")], axis=1
        )

        # Map values from text to enum
        # empty cells are move visible than "nan" used by default

        enum_yn = {
            "Nej": "no",
            "nej": "no",
            "n": "no",
            "Ja": "yes",
            "ja": "yes",
            "j": "yes",
            "x": "yes",
            "y": "yes",
        }

        enum_conn_phase = {
            "1.Anslutningsmöjlighet": "1_request",
            "2.Reservationsavtal": "2_reservation",
            # "3_estimation"
            "4.Projekteringsavtal": "4_planning",
            "5.Anslutningsavtal": "5_connection",
            "6.Nätavtal": "6_network",
        }

        enum_type_l1 = {
            "Nyanslutning": "new",
            "Utökning": "expansion",
            "Flytt av anläggning": "move",
            "Flytt": "move",
            "Övrigt": "other",
        }

        enum_type_l2 = {
            "Konsumtion": "consumption",
            "Produktion": "production",
            "Konsumtion och Produktion": "consumptionProduction",
            "Konsumtion/Produktion": "consumptionProduction",
            "Övrigt": "other",
        }

        maps = {
            "extra.capacityLimitedArea": enum_yn,
            # "active_queue": enum_yn,
            "extra.nationalTransmissionGridConnectionProcess": enum_yn,
            # "positive_notice": enum_yn,
            "status": enum_conn_phase,
            "connectionKind": enum_type_l1,
            "connectionEnergyKind": enum_type_l2,
        }

        # asint = ["connectivityNode.id"]

        # for column in asint:
        #     df[column] = df[column].fillna(0).astype(int)

        for k, v in maps.items():
            if k in df:
                df[k] = df[k].map(lambda x: v.get(x, ""))

        # Code and ID as sting
        for column in df:
            if (
                column == "code"
                or column == "id"
                or column == "connectivityNode.id"
                or column.endswith("_code")
                or column.endswith("_id")
            ):
                logger.info("Column converted to string: " + column)
                df[column] = df[column].astype(str)

        # admin geo

        if os.path.exists(admin_geo_lookup_csv):
            admin_geo = pd.read_csv(admin_geo_lookup_csv)
            logger.info("%s admin_geo loaded." % admin_geo.size)

            def admin_geo_l2_name_lookup(row, *args):
                adminGeo = {}
                adminGeo["level2_name"] = row["adminGeo_level2_name"]

                if not adminGeo["level2_name"] is None:
                    geoLookup = admin_geo.loc[
                        admin_geo["NAME_2"] == adminGeo["level2_name"]
                    ]
                    if geoLookup.size > 0:
                        adminGeo["code"] = geoLookup["OBJECTID"].values[0].item()
                        adminGeo["level0_code"] = geoLookup["ISO"].values[0]
                        adminGeo["level0_name"] = geoLookup["NAME_0"].values[0]
                        adminGeo["level1_code"] = geoLookup["ID_1"].values[0].item()
                        adminGeo["level1_name"] = geoLookup["NAME_1"].values[0]
                        adminGeo["level2_code"] = geoLookup["ID_2"].values[0].item()
                        adminGeo["level2_name"] = geoLookup["NAME_2"].values[0]

                return adminGeo

            df["adminGeo"] = df.apply(
                admin_geo_l2_name_lookup, axis=1, result_type="reduce"
            )
            df = df.drop(columns=["adminGeo_level2_name"])

        # Process Embedded Objects
        embed_columns = df.filter(like=".", axis=1)
        obj_list = []

        for col in list(embed_columns):  # type: ignore
            obj_list.append(col[: col.index(".")])
        obj_list = list(set(obj_list))

        def cut_prefix(v):
            return v[v.index(".") + 1 :]

        df.drop(columns=obj_list, inplace=True, errors="ignore")

        for obj in obj_list:
            df[obj] = (
                df.filter(like=obj + ".", axis=1)
                .rename(columns=cut_prefix)
                .to_dict("records")
            )

        # df.insert(1,obj, df.filter(like=obj+'.',axis=1).rename(columns=cutPrefix).to_dict('records'))
        # for  col in df.filter(like='.',axis=1):
        #     del df[col]

        # df.filter(like='extra.',axis=1).rename(cutPrefix, axis='columns')
        # df.filter(like='extra.',axis=1).to_dict('records')

        # Milestones

        map_dates = {
            "createdDateTime": "1_request",
            "date_reservation_agreement": "2_reservation",
            "date_estimation_agreement": "3_estimation",
            "date_planning_agreement": "4_planning",
            "date_connection_agreement": "5_connection",
            "date_network_aggreement": "6_network",
            "date_customerDeclined": "0_cancelled",
        }

        def milestones(row, *args):
            milestones = []
            for in_key, out_key in map_dates.items():
                val = getattr(row, in_key, None)
                if not pd.isnull(val):
                    milestones.append(
                        {"value": in_key, "reason": out_key, "dateTime": val}
                    )

            return milestones

        df["milestone"] = df.apply(milestones, axis=1, result_type="reduce")

        # Remove auxiliary Columns
        df_res = df

        # . in caption
        df_res = df_res.drop(list(df_res.filter(like=".", axis=1)), axis=1)

        # date_*
        df_res = df_res.drop(list(df_res.filter(like="date_", axis=1)), axis=1)

        return df_res

    def load_scenario_sheet(self, xlsx_input_path: str):
        # Read XLSX file to dataframe

        df = pd.read_excel(
            xlsx_input_path, sheet_name="Scenarios", header=0, parse_dates=True
        )

        # Map excel columns to model
        # Rename excel headers, columns started from **excluded** removed

        columns_map = {
            "Code": "code",
            "Name": "name",
            "Priority": "priotrity",
            "Created": "createdDateTime",
            "State": "state",
            "Author": "tmp_author",
            "Requests": "tmp_request_list",
        }

        def mapp(v):
            x = v.replace("\n", " ")
            x = " ".join(x.split())
            return columns_map.get(x, x)

        # rename
        df = df.rename(columns=mapp)

        # author

        def author_expand(row, *args):
            obj = {}
            obj["fullName"] = row["tmp_author"]
            # jobTitle  can be added if need
            return obj

        df["author"] = df.apply(author_expand, axis=1, result_type="reduce")

        df = df.drop(columns=["tmp_author"])

        # connection requests referencnes

        def con_req_ref_expand(row, *args):
            obj = []
            for ref in row["tmp_request_list"].split(","):
                obj.append({"refId": ref})
            # jobTitle  can be added if need
            return obj

        df["connectionRequestsList"] = df.apply(
            con_req_ref_expand, axis=1, result_type="reduce"
        )

        df = df.drop(columns=["tmp_request_list"])
        return df

    def to_json(self, conn_req_df, scenarious_df):
        # Save unified model data to JSON
        # resultDict = df_res.apply(lambda x : x.dropna().to_dict(),axis=1)
        con_req_dict = conn_req_df.to_dict(orient="records")
        scenarious_dict = scenarious_df.to_dict(orient="records")

        def remove_nans(d):
            for key in d.copy():
                if type(d[key]) == float and isnan(d[key]):
                    del d[key]
                elif type(d[key]) == dict:
                    remove_nans(d[key])

        # for item in scenarious_df:
        #     remove_nans(item)

        for item in con_req_dict:
            remove_nans(item)
            try:
                conn_node_id = str(
                    item.get("connectivityNode", {}).get("id", None) or 0
                )
                coords = defaultdict(str)
                coords.update(item["extra"])

                normalized = self.normalize_coords(coords, conn_node_id)
                item["extra"].update(normalized)

            except Exception as e:
                logger.exception(f"Failed to normalize coordinates: {e}")

        result_obj = {}
        result_obj["gridConnectionRequestList"] = {
            "gridConnectionRequest": con_req_dict
        }

        result_obj["gridConnectionScenarioList"] = {
            "gridConnectionScenario": scenarious_dict
        }

        json_str = json.dumps(
            obj=result_obj,
            indent=4,
            default=json_serializer,
            allow_nan=False,
        )
        return json.loads(json_str)

    def validate_result(self, json_data: dict):
        schema_file = load_json(jsonschema_path)

        try:
            jsonschema.validate(instance=json_data, schema=schema_file)
            logger.info("Given JSON data is Valid")

        except jsonschema.exceptions.ValidationError as err:  # type: ignore
            logger.info("Given JSON data is InValid %r" % err)
            raise err

    def run(self, xlsx_input_path: str):
        conn_req_df = self.load_conn_req_sheet(xlsx_input_path)
        scenarious_df = self.load_scenario_sheet(xlsx_input_path)

        serialized = self.to_json(conn_req_df, scenarious_df)
        self.validate_result(serialized)

        return serialized
