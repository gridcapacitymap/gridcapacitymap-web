import logging

import redis.asyncio as redis
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database.dependencies import get_db_session
from ..tasks import celeryconfig

router = APIRouter(tags=["default"])


@router.get("/")
async def index():
    return RedirectResponse(url="/api/healthcheck")


@router.get("/api/healthcheck")
async def healthcheck(sess: AsyncSession = Depends(get_db_session)):
    result = await sess.execute(text("SELECT VERSION()"))
    db_version = result.scalars().all()

    r = await redis.from_url(celeryconfig.result_backend, decode_responses=True)
    redis_version = (await r.execute_command("INFO"))["redis_version"]
    await r.close()

    logging.info(f"healthcheck: postgres={db_version}, redis={redis_version}")
    return {"version": f"{settings.APP_VERSION}-{settings.APP_COMMIT}"}
