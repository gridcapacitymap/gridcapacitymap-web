from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession


async def get_or_create(session: AsyncSession, model, **kwargs):
    try:
        q = await session.execute(select(model).filter_by(**kwargs))
        instance = q.scalar_one()
    except NoResultFound:
        instance = model(**kwargs)
        session.add(instance)
        await session.commit()
    return instance
