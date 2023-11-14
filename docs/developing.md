## Introduction

High-level overview of project components is available in [architecture.md](architecture.md)

The project uses docker as platform both for development and deployment.

Strategy for local development is to run services via `docker-compose` and have `devcontainer` in vscode for running language server(s) for auto-completion, console commands, using debugger.

Vscode is recommended as IDE. It's config files are located in `.vscode` dir and aim to provide ready-to-use development environment for backend and frontend applications.

## Database & migrations

Detect model changes and allow alembic to generate corresponding migration

```
docker-compose exec backend bash -c 'alembic revision --autogenerate -m "My auto migration"'
```

Upgrade database to latest migration (manually)

```
docker-compose exec backend bash -c 'alembic upgrade head'
```

Downgrade to previous db revision

```
docker-compose exec backend bash -c 'alembic downgrade -1'
```

## Purge development environment

The command will clean all development environment, except downloaded images from docker hub

```
docker-compose down --remove-orphans --rmi local -v
```

Remove only database container and volume

```
docker-compose rm -s -v postgreshost redis
```

## Map tiles provider

The repository uses public vector tiles provider listed at [wiki.openstreetmap.org](https://wiki.openstreetmap.org/wiki/Vector_tiles#Providers). This is available for non-commercial usage.

For commercial purposes we need to buy subscription from one of map tiling services or build and host map tiles ourselves.

See proof-of-concept guide for self-hosted map tiles in [tilemaker_guide.md](tilemaker_guide.md)

## Benchmarking

This section will describe strategy for performance profiling. A primitive test can look as follows

```
docker run --network=host --rm skandyla/wrk -t12 -c400 -d30s http://localhost:8000/api/connection-requests/
```
