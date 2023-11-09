from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class AuthzScopes(str, Enum):
    NET_READ_BY_ID = "networks#net:{net_id}:read"
    NET_UPDATE_BY_ID = "networks#net:{net_id}:update"
    NET_ADMIN = "networks#net:*"
    NET_ANY = "networks#"


class GrantedUmaPermissions(BaseModel):
    rsname: str  # Keycloak resource name
    rsid: str  # Keycloak resource id
    scopes: List[str] = []


class OIDCIdentity(BaseModel):
    exp: Optional[int] = None
    iat: Optional[int] = None
    iss: Optional[str] = None
    sub: Optional[str] = None
    typ: Optional[str] = None
    azp: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None

    scope: Optional[str] = None
    uma_permissions: List[GrantedUmaPermissions] = []
