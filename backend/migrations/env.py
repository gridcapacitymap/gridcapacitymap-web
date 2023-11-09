import asyncio
import importlib
from logging.config import fileConfig

from alembic import context
from geoalchemy2 import alembic_helpers
from gridmap.config import settings
from gridmap.database.core import Base
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Import all models, so alembic can inspect them
_MODEL_FILES = (
    "gridmap.connections.models",
    "gridmap.headroom.models",
    "gridmap.networks.models",
    "gridmap.scenarios.models",
)

for model_file in _MODEL_FILES:
    try:
        loaded_module = importlib.import_module(model_file)
    except ModuleNotFoundError:
        print(f"Could not import module {model_file}")


# Avoid alembic trying to remove tables that are not part of current models
# https://github.com/sqlalchemy/alembic/issues/596#issuecomment-524670534
def include_name(object, name, type_, reflected, compare_to):
    if type_ == "table" and reflected and compare_to is None:
        return False
    else:
        return True


# Using Asyncio with Alembic
# https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # https://geoalchemy-2.readthedocs.io/en/latest/alembic.html
        include_object=include_name,
        process_revision_directives=alembic_helpers.writer,
        render_item=alembic_helpers.render_item,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # https://geoalchemy-2.readthedocs.io/en/latest/alembic.html
        include_object=include_name,
        process_revision_directives=alembic_helpers.writer,
        render_item=alembic_helpers.render_item,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online():
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
