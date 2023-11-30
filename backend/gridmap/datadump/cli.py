import asyncio
import logging
import os
from datetime import datetime
from functools import partial
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from ..config import settings
from ..headroom.schemas import GridCapacityConfig
from ..networks.models import Bus, Network
from ..networks.schemas import (
    NetworkMetadataImport,
    SerializedNetwork,
    SerializedSubsystems,
    SubsystemGeoJson,
)
from ..networks.service import NetworkSubsystemsService
from ..wait_for_db import wait_db_ready
from .schemas import ConnectionsUnifiedSchema
from .service import DataDumpService
from .xlsx_importer import ConnectionRequestsImporter, mock_connection_coords


def load_metadata(dirpath: str):
    metadata_path = os.path.join(dirpath, "metadata.json")
    with open(metadata_path, "r") as fh:
        metadata = NetworkMetadataImport.model_validate_json(fh.read())

    cfg_path = os.path.join(dirpath, metadata.gridcapacity.config)
    with open(cfg_path, "r") as fh:
        gridcapacity_config = GridCapacityConfig.model_validate_json(fh.read())

    return metadata, gridcapacity_config


async def import_network_data(basedir: str, net_service: NetworkSubsystemsService):
    metadata, cfg = load_metadata(basedir)
    subsystems_path = os.path.join(basedir, metadata.dump.subsystems)
    geodata_path = os.path.join(basedir, metadata.dump.geodata)

    cfg.case_name = os.path.join(os.path.basename(basedir), cfg.case_name)

    existing_network = await net_service.session.scalar(
        select(Network).filter(
            Network.gridcapacity_cfg["case_name"].as_string() == cfg.case_name
        )
    )

    if existing_network:
        logging.info(f"Network with case_name '{cfg.case_name}' is already present")
        mtime = datetime.fromtimestamp(
            max(
                os.path.getmtime(subsystems_path),
                os.path.getmtime(geodata_path),
            )
        )
        should_import_subsystems = (
            existing_network.created_at
            and mtime > existing_network.created_at
            and metadata.overwrite_if_modified
        )
        if not should_import_subsystems:
            raise RuntimeWarning(f"network {existing_network.id} been imported already")
    else:
        n = SerializedNetwork(
            title=os.path.basename(basedir),
            solver_backend=metadata.gridcapacity.backend,
            gridcapacity_cfg=cfg,
        )
        existing_network = await net_service.create_network(n)

    with open(subsystems_path, "r") as fh:
        ss = SerializedSubsystems.model_validate_json(fh.read())
        await net_service.import_subsystems(existing_network.id, ss)  # type: ignore

    logging.info(f"subsystems {subsystems_path} import is complete")

    with open(geodata_path, "r") as fh:
        geodata = SubsystemGeoJson.model_validate_json(fh.read())
        await net_service.import_subsystem_geodata(existing_network.id, geodata)  # type: ignore

    logging.info(f"geodata {geodata_path} import is complete.")
    return existing_network.id, metadata


async def import_connection_requests(
    basedir: str,
    net_id: str,
    metadata: NetworkMetadataImport,
    datadump_service: DataDumpService,
):
    distance = metadata.connectionRequests.fake_coords_distance
    xlsx_path = os.path.join(basedir, metadata.connectionRequests.xlsx)

    logging.info(
        f"Processing connection requests from {xlsx_path} with location mock ({distance}m)..."
    )

    all_buses = await datadump_service.session.scalars(
        select(Bus).filter(Bus.net_id == net_id)
    )

    if metadata.connectionRequests.fake_coords_distance:
        process_coords = partial(
            mock_connection_coords,
            list(all_buses.all()),
            distance,
        )

        imp = ConnectionRequestsImporter(process_coords)
    else:
        imp = ConnectionRequestsImporter()

    serialized = imp.run(xlsx_path)

    # transform data to pydantic model
    model = ConnectionsUnifiedSchema.model_validate(serialized)

    # replace connection requests & scenarios in database
    await datadump_service.import_unified(net_id, model)  # type: ignore

    logging.info(f"Processing connection requests from {xlsx_path} is completed")


async def process(data_path: str, sess: AsyncSession):
    directories = [str(entry) for entry in Path(data_path).iterdir() if entry.is_dir()]

    net_service = NetworkSubsystemsService(sess)
    datadump_service = DataDumpService(sess)

    for p in directories:
        try:
            net_id, metadata = await import_network_data(p, net_service)
            await import_connection_requests(p, net_id, metadata, datadump_service)
        except FileNotFoundError:
            continue
        except RuntimeWarning as e:
            logging.warning(e)
        except Exception as e:
            logging.error(f"Failed to process network data from '{p}'")


async def main():
    location = os.environ["NET_DATA_ROOT"]

    try:
        await wait_db_ready()

        engine = create_async_engine(
            settings.DATABASE_URL, pool_size=2, max_overflow=10
        )
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as sess:
            await process(location, sess)
    finally:
        await sess.close()
        await engine.dispose()


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
