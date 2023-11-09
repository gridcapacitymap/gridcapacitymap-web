import json
from contextlib import asynccontextmanager
from typing import Annotated, List

from fastapi import Depends, FastAPI, HTTPException, Request, Security, status
from fastapi.exceptions import HTTPException
from fastapi.security import OAuth2AuthorizationCodeBearer
from keycloak.uma_permissions import UMAPermission
from pydantic import Json

from keycloak import (  # type: ignore
    KeycloakAdmin,
    KeycloakError,
    KeycloakOpenID,
    KeycloakUMA,
)

from .config import settings
from .schemas import OIDCIdentity


class Default(dict):
    def __missing__(self, key):
        return key.join("{}")


def _get_kc_openid():
    return KeycloakOpenID(
        server_url=settings.server_url,
        client_id=settings.client_id,
        realm_name=settings.realm,
        client_secret_key=settings.client_secret,
        verify=True,
    )


def _get_kc_uma():
    service_account = KeycloakAdmin(
        server_url=settings.server_url,
        client_id=settings.client_id,
        client_secret_key=settings.client_secret,
        realm_name=settings.realm,
    )
    assert service_account.connection
    return KeycloakUMA(connection=service_account.connection)


@asynccontextmanager
async def init_keycloak(application: FastAPI, *args, **kw):
    application.state.kc_openid = _get_kc_openid()

    try:
        yield
    finally:
        pass


def _get_kc_oidc(request: Request):
    return request.app.state.kc_openid


get_kc_oidc = Annotated[KeycloakOpenID, Depends(_get_kc_oidc)]
get_kc_uma = Annotated[KeycloakUMA, Depends(_get_kc_uma)]

# https://github.com/tiangolo/fastapi/issues/1428
# This is just for fastapi docs
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=settings.authorization_url,
    tokenUrl=settings.token_url,
)


def _get_idp_public_key(keycloak_openid: KeycloakOpenID):
    return (
        "-----BEGIN PUBLIC KEY-----\n"
        f"{keycloak_openid.public_key()}"
        "\n-----END PUBLIC KEY-----"
    )


def get_auth(
    keycloak_openid: get_kc_oidc, token: str = Security(oauth2_scheme)
) -> Json:
    try:
        return keycloak_openid.decode_token(
            token,
            key=_get_idp_public_key(keycloak_openid),
            options={"verify_signature": True, "verify_aud": True, "exp": True},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),  # "Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# FastAPI runs dependencies before running the path operation function and then passes the values where needed.
# If a dependency requires another subdependency, FastAPI runs that first,
# again, if it's an async function, on the event loop on the main thread (it just awaits it) and if it's a regular def function it runs it on a thread worker
# https://github.com/tiangolo/fastapi/issues/2619
def get_current_user(required_permissions: List[str] = []):
    def _wrapped(
        request: Request,
        keycloak_openid: get_kc_oidc,
        token: str = Security(oauth2_scheme),
        identity_raw: Json = Depends(get_auth),
    ) -> OIDCIdentity:
        required_uma_permissions: List[UMAPermission] = []

        if required_permissions:
            params = Default(request.path_params)
            for x in required_permissions:
                desc = x.format_map(params).split("#", maxsplit=2)
                rs, sc = desc if len(desc) == 2 else (desc[0], "")
                required_uma_permissions.append(UMAPermission(resource=rs, scope=sc))

        try:
            identity_raw["uma_permissions"] = keycloak_openid.uma_permissions(
                token, permissions=required_uma_permissions  # type: ignore
            )

            identity_raw["name"] = identity_raw.get("name", None) or identity_raw.get(
                "preferred_username", None
            )
            identity = OIDCIdentity(**identity_raw)

            if required_uma_permissions and not identity.uma_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Lacking one of required permissions ({required_uma_permissions})",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return identity

        except KeycloakError as e:
            try:
                message = json.loads(e.error_message)
            except json.JSONDecodeError:
                message = str(e)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message,
                headers={"WWW-Authenticate": "Bearer"},
            )

    return _wrapped
