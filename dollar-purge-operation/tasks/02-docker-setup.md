# Task 2: Docker Setup

## Objective
Create docker-compose.yml for Aidbox and PostgreSQL based on S3 example.

## File to create:
- `docker-compose.yml`

## Services needed:
1. **aidbox_db** - PostgreSQL database
   - Image: healthsamurai/aidboxdb:17
   - Environment: POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD
   - Volume for data persistence

2. **aidbox** - Aidbox FHIR server
   - Image: healthsamurai/aidboxone:edge
   - Port: 8888
   - Environment variables for configuration
   - BOX_INIT_BUNDLE pointing to init-bundle.json

## Key differences from S3 example:
- Remove minio service (not needed)
- Add BOX_INIT_BUNDLE environment variable
- Configure host.docker.internal for TypeScript app communication

## Success criteria:
- `docker-compose up` starts Aidbox successfully
- Aidbox accessible at http://localhost:8888
- Init bundle is loaded on startup