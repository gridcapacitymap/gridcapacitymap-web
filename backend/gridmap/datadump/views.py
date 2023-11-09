import os
import shutil
import tempfile
import uuid
from functools import partial
from typing import Annotated, List, Optional, Union

from fastapi import APIRouter, Depends, Form, Response, UploadFile, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select

from ..auth.dependencies import get_current_user
from ..auth.schemas import AuthzScopes, OIDCIdentity
from ..networks.models import Bus
from .schemas import (
    ConnectionRequestSplunk,
    ConnectionScenarioSplunk,
    ConnectionsUnifiedSchema,
)
from .service import DataDumpService
from .xlsx_importer import ConnectionRequestsImporter, mock_connection_coords

router = APIRouter(prefix="/nets/{net_id}/connections", tags=["connections"])

DataDumpServiceAnnotated = Annotated[
    DataDumpService,
    Depends(),
]


@router.get("/export/unified", response_model=ConnectionsUnifiedSchema)
async def export_connections_json(
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
    service: DataDumpServiceAnnotated,
):
    return await service.export_unified(net_id)


@router.get(
    "/export/splunk",
    response_model=List[Union[ConnectionRequestSplunk, ConnectionScenarioSplunk]],
)
async def export_splunk_json(
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
    service: DataDumpServiceAnnotated,
):
    return await service.export_splunk(net_id)


@router.put(
    "/import/unified",
    status_code=status.HTTP_201_CREATED,
    description="Import connection requests & scenarios from json. Replaces existing entities in database",
)
async def import_connections_unified_json(
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
    payload: ConnectionsUnifiedSchema,
    service: DataDumpServiceAnnotated,
):
    await service.import_unified(net_id, payload)
    return Response(status_code=status.HTTP_201_CREATED)


@router.put(
    "/import/xlsx",
    status_code=status.HTTP_201_CREATED,
    description="Import connection requests & scenarios from excel file. Replaces existing entities in database",
)
async def import_connections_xlsx(
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
    file: UploadFile,
    service: DataDumpServiceAnnotated,
    fake_coords_distance: Annotated[
        Optional[int],
        Form(description="distance from connection point in meters (optional)"),
    ] = 0,
):
    # Get the file size (in bytes)
    file.file.seek(0, 2)
    file_size = file.file.tell()

    # move the cursor back to the beginning
    await file.seek(0)

    if file_size > 2 * 1024 * 1024:
        # more than 2 MB
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large",
        )

    # check the content type (MIME type)
    content_type = file.content_type

    if content_type not in [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type"
        )

    serialized = {}
    file.filename = file.filename or uuid.uuid4().hex

    with tempfile.TemporaryDirectory() as upload_dir:
        dest = os.path.join(upload_dir, file.filename)

        # copy the file contents
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        process_coords = None
        if fake_coords_distance:
            print(
                f"Mocking connection requests location to be within {fake_coords_distance}m away from target bus"
            )
            all_buses = await service.session.scalars(
                select(Bus).filter(Bus.net_id == net_id)
            )
            process_coords = partial(
                mock_connection_coords,
                list(all_buses.all()),
                fake_coords_distance,
            )

        imp = ConnectionRequestsImporter(process_coords)
        serialized = imp.run(dest)

    # transform data to pydantic model
    model = ConnectionsUnifiedSchema.model_validate(serialized)

    # replace connection requests & scenarios in database
    await service.import_unified(net_id, model)

    return Response(status_code=status.HTTP_201_CREATED)
