# Gridmap webgis

# Development setup

This frontend is part of monorepo, see instructions on setup from repo's root `README.md`

Frontend api client module is auto-generated based on openapi json spec.

1. Start project locally with `docker-compose up`
2. Regenerate api client with command

```
docker-compose exec gridmap_maplibre bash -c 'yarn generate-client --useOptions && yarn format'
```
