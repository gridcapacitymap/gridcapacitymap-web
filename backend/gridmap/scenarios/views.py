import datetime
import logging
import uuid
from typing import Annotated, List, Union

from celery import states
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, select, update
from sqlalchemy.orm import joinedload

from ..auth.dependencies import get_current_user
from ..auth.schemas import AuthzScopes, OIDCIdentity
from ..connections.models import ConnectionRequest, User
from ..database.dependencies import DatabaseSession
from ..database.helpers import get_or_create
from ..headroom.schemas import ScenarioHeadroomSchema
from ..headroom.service import ScenarioHeadroomService
from ..networks.schemas import UNATTENDED_SOLVER_BACKENDS
from ..schemas.paginated import PaginatedResponse, PaginationQueryParams
from ..tasks.gridcapacity_task import run_solver
from .models import ConnectionScenario
from .schemas import (
    ConnectionScenarioUnified,
    ScenarioBaseApiSchema,
    ScenarioDetailsApiSchema,
)
from .service import ConnectionScenarioService

router = APIRouter(prefix="/nets/{net_id}/scenarios", tags=["scenarios"])

ConnectionScenarioServiceAnnotated = Annotated[ConnectionScenarioService, Depends()]


@router.get("/", response_model=PaginatedResponse[ScenarioBaseApiSchema])
async def list_connection_scenarios(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
    net_id: uuid.UUID,
    service: ConnectionScenarioServiceAnnotated,
    q: PaginationQueryParams = Depends(),
    author_full_name: str = Query(default=""),
    solver_status: List[str] = Query(
        default=[], example=["PENDING", "STARTED", "PROGRESS", "SUCCESS", "FAILURE"]
    ),
):
    return await service.filter(
        net_id=net_id,
        author=author_full_name,
        solver_status=solver_status,
        limit=q.limit,
        offset=q.offset,
    )


@router.post("/")
async def create_scenario(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[
                    AuthzScopes.NET_UPDATE_BY_ID,
                    AuthzScopes.NET_ADMIN,
                ]
            )
        ),
    ],
    net_id: uuid.UUID,
    payload: ConnectionScenarioUnified,
    session: DatabaseSession,
):
    sc = ConnectionScenario()

    sc.code = payload.code
    sc.name = payload.name
    sc.priority = payload.priority
    sc.created_at = datetime.datetime.utcnow()
    sc.state = payload.state
    sc.connection_requests = []
    sc.headroom = []
    sc.author = await get_or_create(session, User, full_name=usr.name)
    sc.net_id = net_id  # type: ignore

    session.add(sc)
    await session.flush()

    connection_request_ids = [x.refId for x in payload.connectionRequestsList]
    q = await session.scalars(
        select(ConnectionRequest)
        .options(joinedload(ConnectionRequest.bus))
        .filter(ConnectionRequest.id.in_(connection_request_ids))
    )
    sc.connection_requests = list(q.unique())

    for c in sc.connection_requests:
        if str(c.bus.net_id) != str(sc.net_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Connection request ({c.project_id}) is not on the same network",
            )

    response = ConnectionScenarioUnified.from_sa(sc)
    await session.commit()

    return response


@router.get("/{scenario_id}", response_model=ScenarioDetailsApiSchema)
async def get_scenario_details(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[AuthzScopes.NET_READ_BY_ID, AuthzScopes.NET_ADMIN]
            )
        ),
    ],
    net_id: uuid.UUID,
    scenario_id: uuid.UUID,
    service: ConnectionScenarioServiceAnnotated,
):
    result = await service.find_scenario_details(scenario_id, net_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection scenario was not found",
        )

    return result


@router.patch("/{scenario_id}")
async def patch_scenario_headroom(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[
                    AuthzScopes.NET_UPDATE_BY_ID,
                    AuthzScopes.NET_ADMIN,
                ]
            )
        ),
    ],
    net_id: uuid.UUID,
    scenario_id: uuid.UUID,
    payload: ScenarioHeadroomSchema,
    session: DatabaseSession,
):
    """
    Replace calculated headroom for given scenario
    """
    service = ScenarioHeadroomService(session)
    try:
        await service.update_scenario_headroom(scenario_id, payload)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    return Response(status_code=status.HTTP_201_CREATED)


@router.post("/{scenario_id}/calculation")
async def calculate_scenario(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[
                    AuthzScopes.NET_UPDATE_BY_ID,
                    AuthzScopes.NET_ADMIN,
                ]
            )
        ),
    ],
    net_id: uuid.UUID,
    scenario_id: uuid.UUID,
    service: ConnectionScenarioServiceAnnotated,
    session: DatabaseSession,
    only_affected_buses: int = Query(0, ge=0, le=1),
):
    result = await service.find_scenario_details(scenario_id, net_id)

    if not result:
        raise HTTPException(status_code=404, detail="Connection scenario was not found")

    if result.solverBackend not in UNATTENDED_SOLVER_BACKENDS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unattended calculation not supported by solver backend ({result.solverBackend})",
        )

    if result.solverStatus and result.solverStatus not in states.READY_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Calculation request is already pending ({result.solverStatus})",
        )

    serialized = result.model_dump_json(exclude_none=True)
    task = run_solver.delay(serialized, bool(only_affected_buses))
    logging.info(f"celery task_id {task.id} has been queued")

    await session.execute(
        update(ConnectionScenario)
        .where(ConnectionScenario.id == scenario_id)
        .values(solver_task_status=task.state, solver_task_id=task.id)
    )
    await session.commit()

    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.delete("/{scenario_id}")
async def remove_scenario(
    usr: Annotated[
        OIDCIdentity,
        Depends(
            get_current_user(
                required_permissions=[
                    AuthzScopes.NET_UPDATE_BY_ID,
                    AuthzScopes.NET_ADMIN,
                ]
            )
        ),
    ],
    net_id: uuid.UUID,
    scenario_id: uuid.UUID,
    session: DatabaseSession,
):
    await session.execute(
        delete(ConnectionScenario).where(
            ConnectionScenario.id == scenario_id, ConnectionScenario.net_id == net_id
        )
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
