import asyncio
import logging

from sqlalchemy.ext.asyncio import create_async_engine

from ..config import settings
from .core import Base


async def create_schema() -> None:
    logging.info(f"Creating schema ...")

    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logging.info("Schema created.")


if __name__ == "__main__":
    asyncio.run(create_schema())
