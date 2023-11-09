import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy.exc import NoResultFound

from .auth.config import swagger_ui_init_oauth
from .auth.dependencies import init_keycloak
from .cache.dependencies import create_redis_pool
from .connections.views import router as ConnectionRequestsRouter
from .database.session import sa_engine
from .datadump.views import router as DataDumpRouter
from .healthcheck.views import router as healthcheck_router
from .networks.views import router as SubsystemsRouter
from .scenarios.views import router as ConnectionScenariosRouter
from .tasks_monitor.service import celery_task_monitor
from .tasks_monitor.views import router as WebsocketsRouter

api_router = APIRouter(prefix="/api")

api_router.include_router(ConnectionRequestsRouter)
api_router.include_router(ConnectionScenariosRouter)
api_router.include_router(SubsystemsRouter)
api_router.include_router(WebsocketsRouter)
api_router.include_router(DataDumpRouter)


logging.basicConfig(level=logging.DEBUG)


@asynccontextmanager
async def app_lifespan(application: FastAPI):
    async with sa_engine():
        async with init_keycloak(application):
            async with create_redis_pool(application):
                async with celery_task_monitor(application):
                    yield


def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"


app = FastAPI(
    title="GridMap API",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=app_lifespan,
    swagger_ui_init_oauth=swagger_ui_init_oauth,
)


app.include_router(api_router)
app.include_router(healthcheck_router)


@app.exception_handler(NoResultFound)
async def my_exception_handler(request: Request, exc: NoResultFound):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"message": f"Requested entity cannot be found"},
    )
