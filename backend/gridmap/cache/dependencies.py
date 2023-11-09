import hashlib
import json
import logging
import re
import time
import urllib.parse
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Awaitable, Callable, Union
from urllib.parse import urlencode

import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, status
from pydantic import BaseModel
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff
from redis.exceptions import BusyLoadingError, ConnectionError, TimeoutError

from ..config import settings

retry = Retry(ExponentialBackoff(), 3)


@asynccontextmanager
async def create_redis_pool(application: FastAPI, *args, **kw):
    if not getattr(application.state, "redis", None):
        dsn = settings.REDIS_DSN
        is_secure = dsn.scheme == "rediss"

        assert dsn.host
        assert dsn.port
        assert dsn.path

        application.state.redis = redis.Redis(
            host=dsn.host,
            port=dsn.port,
            username=dsn.username,
            password=urllib.parse.unquote(dsn.password) if dsn.password else None,
            db=int(re.sub("\D", "", dsn.path)),
            ssl=is_secure,
            decode_responses=True,
            auto_close_connection_pool=True,
            health_check_interval=3,
            retry=retry,
            retry_on_error=[BusyLoadingError, ConnectionError, TimeoutError],
        )

    try:
        yield
    finally:
        if getattr(application.state, "redis", None):
            await application.state.redis.close()


def get_redis(request: Union[Request, WebSocket]) -> redis.Redis:
    # Here, we re-use our connection pool
    # not creating a new one
    return request.app.state.redis


class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()


async def cached_json_response(request: Request):
    cache: redis.Redis = get_redis(request)

    async def resolve(
        cache_suffix: str,
        callable: Callable[[Any], Awaitable[Union[dict, list]]],
        ttl: int = 0,
        *args: Any,
        **kw: Any,
    ):
        if request.method != "GET":
            raise HTTPException(
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                detail=f"Attempt to cache response for method {request.method}",
            )

        arg_suffix = urlencode(
            [(i, str(x)) for i, x in enumerate(args)]
            + [(k, str(v)) for k, v in kw.items()]
        )
        cache_key = f"{callable.__module__}__{callable.__qualname__}__{arg_suffix}__{cache_suffix}".lower()
        etag = hashlib.sha1(cache_key.encode()).hexdigest()

        if request.headers.get("if-none-match", None) == etag:
            return Response(status_code=status.HTTP_304_NOT_MODIFIED)

        result = None
        try:
            result = await cache.get(cache_key)
        except Exception as e:
            logging.error(f"Failed to get redis key {cache_key}")
            logging.exception(e)

        if not result:
            now = time.time()
            _result = await callable(*args, **kw)
            logging.info(f"computed new cache for {cache_key} in {time.time() - now}s")

            try:
                if isinstance(_result, BaseModel):
                    result = _result.model_dump_json(by_alias=True)
                else:
                    result = json.dumps(_result, cls=DateTimeEncoder)

                if ttl > 0:
                    # do not use server-side cache, but keep ETag
                    await cache.set(cache_key, result, ex=ttl)
            except Exception as e:
                logging.error(f"Failed to set redis key {cache_key}")
                logging.exception(e)

        return Response(
            content=result, media_type="application/json", headers={"ETag": etag}
        )

    return resolve
