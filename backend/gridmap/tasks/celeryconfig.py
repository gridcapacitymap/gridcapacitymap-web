try:
    from pydantic_settings import BaseSettings  # type: ignore
except ImportError:
    from pydantic import BaseSettings  # type: ignore


class Settings(BaseSettings):  # type: ignore
    CELERY_BROKER_URL: str = "redis://localhost:6379"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379"


settings = Settings()


## Broker settings
broker_url = settings.CELERY_BROKER_URL

# List of modules to import when the Celery worker starts
imports = ("gridmap.tasks",)

## Using the database to store task state and results
result_backend = settings.CELERY_RESULT_BACKEND

# Having a 'started' state ise useful for when there are long running tasks
task_track_started = True

broker_connection_retry_on_startup = True

# https://docs.celeryq.dev/en/latest/userguide/configuration.html#task-acks-late
# https://stackoverflow.com/a/54705644
# https://docs.celeryq.dev/en/latest/userguide/tasks.html#requests-and-custom-requests
task_acks_late = True

task_reject_on_worker_lost = True
