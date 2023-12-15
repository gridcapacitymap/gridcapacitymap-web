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

## Third-party services integration

Suggested approach for 3rd party services is via REST API. Authentication should be performed via [Service Account](https://www.keycloak.org/docs/latest/server_admin/index.html#_service_accounts) in keycloak.

Example flow for making authorized requests from other service within development docker network `gridmap_default` (see docker-compose.yml)

```
# enter bash witin gridmap frontend service
docker-compose exec gridmap_maplibre bash

# Authenticate backend client
# Ensure token is reused until it expires, see "expires_in" response field
# Initial dump has test client pre-created, client_id is hexagon-service
# Please, check keycloak admin console to get/create client secret

curl -X POST -d 'grant_type=client_credentials' -u 'hexagon-service:<client_secret>' http://gridmap_keycloak:8080/realms/aad/protocol/openid-connect/token

# Use obtained access_token from response to access protected endpoints

curl 'http://gridmap_backend:8000/api/nets/5b3ed0c7-20d3-45fe-8c3b-84acb64750d3/geojson/buses?scenario_id=9386ea67-7b4d-4cbf-aea9-63d84c493c41' \
 -H 'Authorization: Bearer <access_token>'
```

## Benchmarking

This section will describe strategy for performance profiling. A primitive test can look as follows

```
docker run --network=host --rm skandyla/wrk -t12 -c400 -d30s http://localhost:8000/api/connection-requests/
```
