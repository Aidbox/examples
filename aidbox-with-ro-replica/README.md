# PostgreSQL Read-Only Replica for Aidbox

This guide demonstrates how to set up Aidbox with a PostgreSQL primary database and read-only replica, and how to configure Aidbox to direct read-only queries to the replica.

## Overview

Aidbox supports delegating read-only queries to a PostgreSQL read-only replica. This feature addresses several critical challenges in high-load FHIR server deployments:

- **Resource Isolation**: Prevents poorly performing read queries from affecting the primary database's performance
- **Load Distribution**: Distributes database load across multiple database servers
- **Improved Read Performance**: Enhances performance for query-heavy workloads
- **System Resilience**: Ensures write operations remain responsive even under heavy read load

By using a read-only replica, you can isolate resource-intensive read operations from write operations, preventing situations where a poorly performing search query might consume all database resources and impact overall system availability.

## Architecture

This setup uses PostgreSQL's built-in streaming replication to maintain a read-only replica of the primary database. Aidbox maintains separate connection pools for:

1. The primary database (for all write operations and default read operations)
2. The read-only replica (for read operations explicitly directed to use the replica)

### Replication Considerations

- **Replication Lag**: Be aware that there may be a delay between when data is written to the primary and when it becomes available on the replica. In most configurations, this lag is minimal (typically less than 50ms), but it can increase under heavy write loads.
- **Consistency Model**: This architecture provides eventual consistency for read operations directed to the replica. If your application requires immediate read-after-write consistency, you should direct those specific read operations to the primary database.

## Up and Running

Below is a Docker Compose configuration ([docker-compose.yml](./docker-compose.yml)) that sets up:

1. A PostgreSQL primary database
2. A PostgreSQL read-only replica
3. Aidbox configured to use both databases

```shell
docker-compose up --wait
```

### Configuration

Pay special attention to these environment variables that enable and configure the read-only replica for Aidbox:

```yaml
# Enable the read-only replica feature
BOX_DB_RO_REPLICA_ENABLED: true

# Configure connection to the read-only replica
BOX_DB_RO_REPLICA_HOST: postgres_replica
BOX_DB_RO_REPLICA_PORT: 5432
BOX_DB_RO_REPLICA_DATABASE: aidbox
BOX_DB_RO_REPLICA_USER: aidbox
BOX_DB_RO_REPLICA_PASSWORD: secret
```

## Usage Examples

### Basic Usage

1. Open Aidbox in your browser at [http://localhost:8080](http://localhost:8080) and log in with your Aidbox account (if you already have a license, login with username: `admin` and password: `A0cDkLXo4w` as defined in the `docker-compose.yml` file).

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

3. Get resources from the read-only replica by adding the `X-USE-RO-REPLICA` header:
   ```json
   GET /fhir/Patient
   X-USE-RO-REPLICA: 1
   ```

4. Operations that attempt to write to the read-only replica will fail:
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
   You'll receive an error indicating that write operations are not allowed on the read-only replica.

### Practical Use Cases

#### Case 1: Heavy Analytics Queries

When running analytics that might involve complex queries across large datasets:

```json
GET /fhir/Observation?code=http://loinc.org|8867-4&_count=100&_sort=date&patient.identifier=urn:oid:1.2.36.146.595.217.0.1|12345
X-USE-RO-REPLICA: 1
```

#### Case 2: Bulk Exports

For bulk export operations that might otherwise put significant load on your primary database:

```json
GET /fhir/$export?_type=Patient,Observation
X-USE-RO-REPLICA: 1
```

#### Case 3: Non-Critical UI Components

For UI components where real-time data is less critical, such as displaying historical patient information:

```json
GET /fhir/Patient/123/history
X-USE-RO-REPLICA: 1
```

## Additional Resources

- [PostgreSQL Replication Documentation](https://www.postgresql.org/docs/current/warm-standby.html)
- [Aidbox Documentation](https://docs.aidbox.app/)
