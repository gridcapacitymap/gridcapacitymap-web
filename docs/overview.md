# Gridcapacity Map deployment overview

As an example Azure ISP is used.

```mermaid
C4Component
      Enterprise_Boundary(b0, "Enterprise Boundary") {
        Person(customerA, "User A", "Grid analyst")
        Person(customerB, "User B", "Coordinator")
        Person(customerC, "User C", "Load Forecast Analyst")

        Enterprise_Boundary(b1, "Azure Deployment") {
            Enterprise_Boundary(b2, "Azure services") {
                System(SystemG, "Azure AD", "Active directory / OpenID")

                SystemDb(SystemD, "Postgres/PostGIS", "- connections & scenarios<br />- network subsystems<br />- calculated headroom<br />- geospatial info")

                System(SystemF, "Redis", "- celery queue backend<br />- celery result backend<br />- caching")
            }

            Enterprise_Boundary(b5, "Gridmap Services") {
                System(SystemAA, "Web Frontend", "Single Page Application (SPA)<br />UI to manage network subsystems, connection scenarios<br />(typescript/React/Ant Design/maplibre)")

                System(SystemE, "Backend", "Provides data management REST API for SPA <br />(python/asyncio/fastapi/sqlalchemy)")

                Enterprise_Boundary(b3, "auto-scaling group") {
                    System(SystemBA, "Gridcapacity worker(s)", "Performing gridcapacity calculations<br />(python/celery/pandapower/psse/PowSyBl)")
                }
            }

            Enterprise_Boundary(b4, "Data providers") {
                System_Ext(SystemCC, "Map Tiles", "Vector Tiles Provider")

                System_Ext(SystemCB, "Data Service", "- Pushes connection requests on schedule<br />- Provides grid geospatial data<br />(eg azure DevOps, Databricks, SAP)")
                System_Ext(SystemCD, "Analytic Tools", "Data warehouse (Splunk, PowerBI, etc)")

                System_Ext(SystemCA, "Blob storage", "Stores network grid cases")
            }
        }
      }

    Enterprise_Boundary(b6, "Software Repositories") {
        System_Ext(SystemDA, "Docker Registry", "Provides base images")
        System_Ext(SystemDB, "NPM", "Node.js package registry")
        System_Ext(SystemDC, "PyPi", "Python package index")
    }

    BiRel(customerA, SystemAA, "Uses")
    BiRel(customerB, SystemAA, "Uses")
    BiRel(customerC, SystemAA, "Uses")

    BiRel(SystemAA, SystemE, "Uses")
    Rel_U(SystemAA, SystemCC, "Uses")
    Rel_U(SystemE, SystemCD, "Export data")

    Rel_U(SystemAA, SystemG, "Authenticate")
    Rel_U(SystemE, SystemD, "Uses")

    Rel_U(SystemE, SystemG, "Verify")
    Rel_U(SystemE, SystemF, "Uses")

    Rel_U(SystemBA, SystemF, "Uses")
    Rel_U(SystemBA, SystemD, "Uses")

    Rel_U(SystemBA, SystemCA, "Read files")
    Rel_U(SystemCB, SystemE, "Push data")

    UpdateRelStyle(SystemAA, SystemG, $offsetY="-20")
    UpdateRelStyle(SystemE, SystemG, $offsetY="-20")

    UpdateLayoutConfig($c4ShapeInRow="10", $c4BoundaryInRow="4")
```

## Gridmap Services

### Backend

Acts as central point to collect and store data about network grid, connection requests, scenarios and corresponding headroom data.
Solution is geared toward using with containers, is stateless and is able to scale horizontally.

Build with Open Source Software(OSS). Highlights:

- python
- pandas
- sqlalchemy (with postgreSQL)
- fastapi + asyncio
- pydantic
- celery

Suggested way to grow is service-oriented architecture (SOA) using message queues to communicate between services.

### Gridcapacity worker

Gridcapacity is a standalone command-line interface (CLI) tool that provides easy integration with popular solutions to perform powerflow calculations for electrical networks. Currently, gridcapacity focuses on working with Siemens PSSE and pandapower.

Tech stack highlights:

- python
- celery
- sqlalchemy
- gridcapacity (pandapower)

Gridcapacity worker is a service that receives configuration for powerflow calculation via celery (task queue) and runs gridcapacity under the hood.

Service requires network models to be available on file system. This can be achieved by mounting corresponding volume into container with the data.

### Web Frontend

Classical SPA providing

- webGIS features to visualize geospatial data
- features to view, filter connection requests
- features to create/delete connection scenarios
- run powerflow calculations for selected scenarios & inspect results
- assist in analysis of network bottlenecks
- possibility to share connection scenarios between users
- authentication against configured identity provider (Azure AD) - TBD
- features for ACL (access control list) management - TBD

Tech stack highlights:

- Typescript
- React
- maplibreGL
- Ant Design (UI components library)
- Vite (build system)

## Data providers

### Map Tiles

Vector tiles are required as base layer for rendering map view. This can be either in-house deployment, or 3rd party service, like maptiler.com

### Data Service

Provides connection requests on regular basis to backend, e.g. via REST API. Connection request data is not updated often (?) and this process can be done weekly.

Another essential component to visualize powergrid is network geospatial data. It is expected to be provided as geojson data by data service. This data is mostly static(?) and can be uploaded once per network.

### Blob Storage

Provides a way to mount powergrid case files into gridcapacity worker container. This data will be sensitive.

## Azure Services

### PostgreSQL & PostGIS

Used as main data storage for backend. PostGIS is used for querying and aggregating geospatial data of connection requests and network subsystems.

![alt text](gridmapdb_er_diagram.png "Title")

### Azure AD

Provides authentication capabilities.

### Redis

Used for celery (distributed task queue) as results backend, and queue backend (recommended to replace with RabbitMQ or alternative in production).

Also results of some heavy db queries that aggregate big chunks of data are cached in redis.
