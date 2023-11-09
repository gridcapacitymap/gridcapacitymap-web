import asyncio
from contextlib import asynccontextmanager
from typing import Any, Awaitable, Callable, Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from ..config import settings

# The pool sizes and tuning on async and sync are different.
# https://docs.sqlalchemy.org/en/14/core/pooling.html#connection-pool-configuration
#
# The recommended way to use pooling is through pgbouncer or like.
#
# However, asyncpg (the underlying library of sqlalchemy async) boasts that
# its connection pool is as good as pgbouncer -
# https://magicstack.github.io/asyncpg/current/usage.html#connection-pools
#
# https://github.com/tiangolo/fastapi/issues/726#issuecomment-557687526
# https://github.com/tiangolo/fastapi/issues/726#issuecomment-1027262629
_async_engine: Optional[AsyncEngine]


async def get_async_engine() -> AsyncEngine:
    assert _async_engine is not None
    return _async_engine


@asynccontextmanager
async def sa_engine(*args, **kw):
    global _async_engine
    _async_engine = create_async_engine(
        settings.DATABASE_URL, pool_size=5, max_overflow=50
    )
    try:
        yield
    finally:
        if _async_engine:
            await _async_engine.dispose()


def async_to_sync_session(callable: Callable[[AsyncSession], Awaitable[Any]]):
    async_engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(async_engine, expire_on_commit=False)

    async def async_main() -> None:
        async with async_session() as session:
            await callable(session)
            await session.commit()

        # for AsyncEngine created in function scope, close and
        # clean-up pooled connections
        await async_engine.dispose()

    asyncio.run(async_main())
