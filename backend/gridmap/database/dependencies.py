from typing import Annotated, AsyncIterable

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .session import get_async_engine


async def get_db_session(
    async_engine=Depends(get_async_engine),
) -> AsyncIterable[AsyncSession]:
    sess = AsyncSession(bind=async_engine)

    try:
        yield sess
    finally:
        await sess.close()


DatabaseSession = Annotated[
    AsyncSession,
    Depends(get_db_session),
]
