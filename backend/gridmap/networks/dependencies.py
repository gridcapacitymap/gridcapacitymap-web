from typing import Annotated

from fastapi import Depends

from .service import NetworkSubsystemsService

NetworkSubsystemsServiceAnnotated = Annotated[NetworkSubsystemsService, Depends()]
