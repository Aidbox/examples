# PostgreSQL Read-Only Replica for Aidbox

This guide demonstrates how to set up Aidbox with a PostgreSQL primary database and read-only replica, and how to configure Aidbox to direct read-only queries to the replica.

## Overview

Aidbox supports delegating read-only queries to a PostgreSQL read-only replica. This feature is useful for:

- Distributing database load across multiple database servers
- Improving read performance for query-heavy workloads
- Ensuring write operations remain responsive even under heavy read load

## Up and Running

Below is a Docker Compose configuration ([docker-compose.yml](./docker-compose.yml)) that sets up:

1. A PostgreSQL primary database
2. A PostgreSQL read-only replica
3. Aidbox configured to use both databases

``` shell
docker-compose up --wait
```

## How to Use

1. Open Aidbox in your browser at [http://localhost:8080](http://localhost:8080) and log in with the default credentials:
   - Username: `admin`
   - Password: `A0cDkLXo4w` (defined in the `docker-compose.yml` file)
2. Open `Rest Console` in Aidbox and create a new resource, for example, a `Patient`:
   ```json
   POST /fhir/Patient

   {
     "resourceType": "Patient",
     "name": [
       {
         "family": "Doe",
         "given": ["John"]
       }
     ]
   }
   ```
3. Get resources from read-only replica:
   ```json
   GET /fhir/Patient
   X-USE-RO-REPLICA: 1
   ```
4. To be sure, that you can't create or update resources on read-only replica, try to create a new resource:
   ```json
   POST /fhir/Patient
   X-USE-RO-REPLICA: 1

   {
     "resourceType": "Patient",
     "name": [
       {
         "family": "Smith",
         "given": ["Jane"]
       }
     ]
   }
   ```
   You should receive an error indicating that the operation is not allowed on the read-only replica.
