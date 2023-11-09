import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ..tasks import celeryapp
from .events import hub
from .utils import parse_task_meta_raw

_celery_monitor = None


async def _monitor_celery_tasks(app: FastAPI):
    """
    Inspect active celery tasks progress

    https://distributedpython.com/posts/custom-celery-task-states/
    https://gist.github.com/siddhism/6399964b89ce734990763c922c3556da
    https://gist.github.com/appeltel/fd3ddeeed6c330c7208502462639d2c9
    """

    try:
        async with app.state.redis.pubsub() as pubsub:
            pattern = f"{celeryapp.celery.backend.task_keyprefix.decode()}*"
            await pubsub.psubscribe(pattern)

            while True:
                if len(hub.subscriptions) > 0:
                    msg = await pubsub.get_message(ignore_subscribe_messages=True)

                    if msg is not None:
                        try:
                            meta = parse_task_meta_raw(msg["data"])
                            hub.publish(meta)
                        except Exception as e:
                            logging.exception(e)

                    await asyncio.sleep(0.1)
                else:
                    await asyncio.sleep(2)
    except Exception as e:
        logging.exception(e)
    finally:
        logging.info("disposing celery monitor...")


@asynccontextmanager
async def celery_task_monitor(app: FastAPI, *args, **kw):
    global _celery_monitor
    if not _celery_monitor:
        _celery_monitor = asyncio.create_task(_monitor_celery_tasks(app))

    try:
        yield
    finally:
        if _celery_monitor:
            _celery_monitor.cancel()
