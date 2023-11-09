from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict  # type: ignore


class KeycloakSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KC_")

    docs_client_id: Optional[str] = ""
    scopes: Optional[str] = None

    authorization_url: str = ""
    token_url: str = ""
    server_url: str = ""
    realm: str = ""
    client_id: str = ""
    client_secret: Optional[str] = None


settings = KeycloakSettings()

swagger_ui_init_oauth = {
    # If you are using pkce (which you should be)
    "usePkceWithAuthorizationCodeGrant": True,
    # Auth fill client ID for the docs with the below value
    "clientId": settings.docs_client_id,  # example-frontend-client-id-for-dev
    # "scopes": settings.auth.scopes,  # [required scopes here]
    "scopes": "openid profile",
}
