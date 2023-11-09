from pydantic import Field, RedisDsn

try:
    from pydantic_settings import BaseSettings  # type: ignore
except ImportError:
    from pydantic import BaseSettings  # type: ignore


class Settings(BaseSettings):  # type: ignore
    """
    App settings.
    Docs at https://docs.pydantic.dev/latest/usage/pydantic_settings/
    """

    # Postgres
    DATABASE_URL: str = ""

    # Versioning
    APP_VERSION: str = "0.0.0"
    APP_COMMIT: str = "none"

    # Redis, should be same as celery result backend
    # https://redis-py.readthedocs.io/en/v4.6.0/examples/connection_examples.html#Connecting-to-Redis-instances-by-specifying-a-URL-scheme.
    # https://redis-py.readthedocs.io/en/v4.6.0/connections.html#async-client
    REDIS_DSN: RedisDsn = Field("redis://redis:6379/1", alias="CELERY_RESULT_BACKEND")


settings = Settings()  # type: ignore
