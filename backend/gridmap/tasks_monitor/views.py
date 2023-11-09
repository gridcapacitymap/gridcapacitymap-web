import asyncio
import logging
from typing import Annotated, Dict, List, Union

from celery.states import READY_STATES
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from websockets.exceptions import ConnectionClosed

from ..cache.dependencies import get_redis
from ..scenarios.models import ConnectionScenario
from ..scenarios.views import ConnectionScenarioServiceAnnotated
from ..tasks import celeryapp
from .events import Subscription, hub
from .schemas import CeleryTaskMetadata, WebsocketSubscribeRequest
from .utils import parse_task_meta_raw

router = APIRouter(prefix="/ws", tags=["ws"])


html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Websocket example</title>
    </head>
    <body>
        <h1>WebSocket example</h1>
        <h3>Press "send" to subscribe for scenario updates</h3>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off" size="50" />
            <button>Send</button>
        </form>
        <ul id='messages'>
        </ul>
        <script>
            document.querySelector("#messageText").value = '{"event": "subscribe", "channel": "scenarios", "ids": ["9686ea67-7b4d-4cbf-aea9-63d84c493c41", "44414527-d13f-42d3-8989-cfb359dfb878"]}'

            var protocol = location.protocol.includes('https') ? 'wss' : 'ws';
            var ws = new WebSocket(`${protocol}://${location.host}/api/ws/events`);
            ws.onmessage = function(event) {
                var messages = document.getElementById('messages')
                var message = document.createElement('li')
                var content = document.createTextNode(event.data)
                message.appendChild(content)
                messages.appendChild(message)
            };
            function sendMessage(event) {
                var input = document.getElementById("messageText")
                ws.send(input.value)
                event.preventDefault()
            }
        </script>
    </body>
</html>
"""


class WebSocketHandler:
    def __init__(
        self,
        scenario_service: ConnectionScenarioServiceAnnotated,
        websocket: WebSocket,
    ) -> None:
        self.websocket = websocket
        self.redis = get_redis(websocket)
        self.scenario_service = scenario_service
        self.scenario_ids: List[str] = []
        self.ongoing_tasks_map: Dict[str, Union[str, None]] = {}

    async def _update_ongoing_tasks_map(self) -> List[CeleryTaskMetadata]:
        if not self.scenario_ids:
            return []

        pending_tasks = (
            await self.scenario_service.session.execute(
                select(
                    ConnectionScenario.id,
                    ConnectionScenario.solver_task_id,
                ).filter(
                    ConnectionScenario.id.in_(self.scenario_ids),
                    ConnectionScenario.solver_task_status.not_in(READY_STATES),
                )
            )
        ).all()

        self.ongoing_tasks_map.update(
            {task_id: str(scenario_id) for (scenario_id, task_id) in pending_tasks}
        )

        task_keys = [
            celeryapp.celery.backend.get_key_for_task(x).decode()
            for x in self.ongoing_tasks_map.keys()
        ]
        task_results = await self.redis.mget(task_keys)
        return [parse_task_meta_raw(x) for x in task_results if x]

    async def _consumer(self, websocket: WebSocket, queue: asyncio.Queue):
        while True:
            msg = await websocket.receive_json()
            model = WebsocketSubscribeRequest.model_validate(msg)
            self.scenario_ids = [str(x) for x in model.ids]
            self.ongoing_tasks_map = {}

            # report tasks progress immediately after subscription has been set
            items = await self._update_ongoing_tasks_map()
            for item in items:
                if item:
                    await queue.put(item)

    async def _producer(self, websocket: WebSocket, queue: asyncio.Queue):
        while True:
            msg: Union[CeleryTaskMetadata, None] = await queue.get()
            try:
                if msg and msg.task_id:
                    # Tasks that have not started yet will not have result data in redis
                    # Therefore task id has to be matched with scenario id here
                    if not msg.scenario_id:
                        if msg.task_id not in self.ongoing_tasks_map.keys():
                            await self._update_ongoing_tasks_map()

                        msg.scenario_id = self.ongoing_tasks_map.get(msg.task_id, None)

                        if not msg.scenario_id:
                            # Unable to map task to observed scenario ids
                            self.ongoing_tasks_map[msg.task_id] = None
                            continue

                    if msg.scenario_id in self.scenario_ids:
                        await websocket.send_json(msg.model_dump(exclude_unset=True))

            except Exception as e:
                logging.exception(e)

    async def handle(self):
        try:
            await self.websocket.accept()

            with Subscription(hub) as queue:
                consumer_task = asyncio.create_task(
                    self._consumer(self.websocket, queue)
                )
                producer_task = asyncio.create_task(
                    self._producer(self.websocket, queue)
                )

                done, pending = await asyncio.wait(
                    [consumer_task, producer_task],
                    return_when=asyncio.FIRST_EXCEPTION,
                )
                for task in pending:
                    task.cancel()

                for task in done:
                    ex = task.exception()
                    if ex and not isinstance(ex, WebSocketDisconnect):
                        logging.error(
                            f"Error in ws handler coroutine",
                            exc_info=ex,
                        )

        except (WebSocketDisconnect, ConnectionClosed):
            logging.info(f"client {self.websocket.client} has disconnected")
        except Exception as e:
            logging.exception(e)


@router.get("/")
async def websocket_example():
    return HTMLResponse(html)


@router.websocket("/events")
async def websocket_endpoint(
    handler: Annotated[WebSocketHandler, Depends()],
):
    await handler.handle()
