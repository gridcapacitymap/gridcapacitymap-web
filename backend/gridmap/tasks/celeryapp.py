import logging
from typing import Union

import gridmap.tasks.celeryconfig as celeryconfig
from celery import Celery
from celery.result import AsyncResult
from celery.signals import task_postrun, task_prerun
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.session import async_to_sync_session
from ..scenarios.models import ConnectionScenario

celery = Celery(__name__)
celery.config_from_object(celeryconfig)

PROGRESS = "PROGRESS"


def update_solver_status(task_id: str, status: str, err: Union[str, None] = None):
    async def async_main(session: AsyncSession):
        await session.execute(
            update(ConnectionScenario)
            .where(ConnectionScenario.solver_task_id == task_id)
            .values(solver_task_status=status, solver_task_status_reason=err)
        )

    async_to_sync_session(async_main)


# https://docs.celeryq.dev/en/stable/userguide/signals.html#signal-ref
# https://docs.celeryq.dev/en/stable/reference/celery.states.html#states


@task_prerun.connect
def task_prerun_handler(sender, *args, **kwargs):
    task_id = sender.request.id
    task_state = AsyncResult(task_id).state
    logging.info(f"{task_id}.prerun ({task_state})")
    update_solver_status(task_id, task_state)


@task_postrun.connect
def task_postrun_handler(sender, *args, **kwargs):
    task_id = sender.request.id
    task_result = AsyncResult(task_id)
    logging.info(f"{task_id}.postrun ({task_result.state})")
    update_solver_status(
        task_id,
        task_result.state,
        str(task_result.result) if task_result.failed() else None,
    )
