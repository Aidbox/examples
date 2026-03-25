---
features: [Canonical Mapping, FHIR Facade, FHIR Search]
languages: [TypeScript]
---

# Canonical Mapping: HIS to FHIR

Two architectural approaches for exposing proprietary Hospital Information System (HIS) data as FHIR R4.

## Problem

Hospital Information Systems use proprietary APIs and data formats. Modern healthcare applications expect data in **FHIR R4** — the international standard for healthcare data exchange.

This example demonstrates how to build a **canonical mapping layer** that translates proprietary HIS data into FHIR resources (Patient, Encounter, Location).

### Context

A typical scenario: a hospital has hundreds of wards, each with dozens of bedside terminals or dashboards that display current ward occupancy. These terminals poll for updated patient data every 30–60 seconds. The underlying HIS exposes this data through a proprietary API — but the consuming applications expect FHIR.

### Requirements

1. **Protocol Translation**: Expose HIS data as FHIR R4 resources (Patient, Encounter, Location)
2. **Efficient Data Access**: Many clients poll for the same ward data every ~60 seconds; the solution must avoid flooding the HIS with redundant API calls

## Two Solutions

### 1. Pure Facade (Synchronous)

```mermaid
graph LR
    subgraph "Clients"
        T1(Client 1):::blue
        T2(Client 2):::blue
        TN(Client N):::blue
    end

    subgraph "FHIR Facade"
        F1(Facade 1):::green
        F2(Facade 2):::green
        R[(Redis<br/>TTL 60s)]:::yellow
    end

    T1 -->|"/fhir/$get-ward-patients"| F1
    T2 -->|"/fhir/$get-ward-patients"| F2
    TN -->|"/fhir/$get-ward-patients"| F1

    F1 <--> R
    F2 <--> R
    F1 -->|HIS API| M(HIS):::orange
    F2 -->|HIS API| M

    classDef blue fill:#e1f5fe,stroke:#01579b
    classDef green fill:#e8f5e9,stroke:#2e7d32
    classDef yellow fill:#fff9c4,stroke:#f9a825
    classDef orange fill:#fff3e0,stroke:#ef6c00
```

**Flow:**

1. Client requests `GET /fhir/$get-ward-patients?ward-id={wardId}`
2. Facade checks Redis cache (TTL 60s)
3. On cache miss: fetch from HIS → map to FHIR → cache → return
4. On cache hit: return cached Bundle

**Response:** FHIR Bundle (type: collection) containing:
- `Location` — the ward
- `Patient` — patients currently in the ward
- `Encounter` — active inpatient encounters linking Patient to Location

**Why Cache?**

Without cache, every terminal request triggers HIS API calls. If a ward has 50 terminals all refreshing every 60 seconds, the same data is fetched 50 times per minute. A shared Redis cache (TTL 60s) ensures one HIS call serves all terminals for that ward.

**Why Redis (not in-memory)?**

In production, the facade runs as multiple replicas behind a load balancer. With in-memory cache, each replica caches independently — redundant HIS calls. Redis provides a single shared cache for all replicas.

### 2. Event-Driven Architecture

```mermaid
graph LR
    subgraph "Event Flow"
        M(HIS):::orange -->|ADT Event| Q[(RabbitMQ)]:::violet
        Q --> C(Consumer):::green
        C -->|"PUT /fhir/Patient, /fhir/Encounter"| FS[(Aidbox)]:::cyan
    end

    subgraph "Clients"
        T1(Client 1):::blue
        T2(Client 2):::blue
    end

    T1 -->|"GET /fhir/Encounter?..."| FS
    T2 -->|"GET /fhir/Encounter?..."| FS

    classDef blue fill:#e1f5fe,stroke:#01579b
    classDef green fill:#e8f5e9,stroke:#2e7d32
    classDef orange fill:#fff3e0,stroke:#ef6c00
    classDef violet fill:#f3e5f5,stroke:#7b1fa2
    classDef cyan fill:#e0f7fa,stroke:#00838f
```

**ADT Events** (Admission, Discharge, Transfer) — HIS publishes full patient data when status changes.

**Flow:**

1. HIS publishes ADT event with full patient/encounter data to RabbitMQ
2. Consumer maps data to FHIR, stores in Aidbox
3. Clients query Aidbox directly via **standard FHIR search**:
   ```
   GET /fhir/Encounter?location=Location/{wardId}&status=in-progress,arrived
       &_include=Encounter:subject
       &_include=Encounter:location
   ```

**Why No Cache?** Aidbox **is** the cache. Data is pre-populated by consumer on ADT events. Clients read from Aidbox, never triggering HIS API calls.

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Approach 1: Pure Facade

```bash
docker compose --profile facade up -d --build
```

Services:
- **his** — http://localhost:4000 (sample HIS API with 7 patients)
- **redis** — localhost:6379
- **facade** — http://localhost:3000

**Test:**

```bash
curl "http://localhost:3000/fhir/\$get-ward-patients?ward-id=ward-001"
```

Returns FHIR Bundle containing:
- **N x Encounter** — active inpatient encounters
- **N x Patient** — patients referenced by encounters
- **1 x Location** — the ward

**Stop:**

```bash
docker compose --profile facade down
```

### Approach 2: Event-Driven

1. Start the services:

```bash
docker compose --profile event-driven up -d --build
```

2. Initialize Aidbox:
   - Open http://localhost:8080 in your browser
   - Log in and initialize the instance with your Aidbox account

Services:
- **rabbitmq** — http://localhost:15672 (Management UI, guest/guest)
- **aidbox** — http://localhost:8080 (FHIR R4 server)
- **consumer** — ADT event consumer

**Test:**

The HIS publishes ADT events with full patient data. Use `publisher.ts` to simulate 7 patient admissions:

```mermaid
sequenceDiagram
    participant P as publisher.ts
    participant Q as RabbitMQ
    participant C as Consumer
    participant A as Aidbox

    P->>Q: 7 x ADT admit events
    Q->>C: Deliver events
    C->>C: Map to FHIR
    C->>A: PUT /fhir/Patient (x7)
    C->>A: PUT /fhir/Encounter (x7)
    C->>A: PUT /fhir/Location (x1)
```

```bash
# 1. Simulate 7 ADT "admit" events
docker compose --profile event-driven run --rm consumer bun run src/event-driven/publisher.ts admit

# 2. Query Aidbox (standard FHIR search with _include)
curl -u root:WdodyB65ij "http://localhost:8080/fhir/Encounter?location=Location/ward-001&status=in-progress,arrived&_include=Encounter:subject&_include=Encounter:location"
```

Returns FHIR Bundle containing:
- **7 x Encounter** (match) — active inpatient encounters
- **7 x Patient** (include) — patients referenced by encounters
- **1 x Location** (include) — the ward

**Stop:**

```bash
docker compose --profile event-driven down
```

## Configuration

| Variable             | Default                         | Description             |
| -------------------- | ------------------------------- | ----------------------- |
| `PORT`               | 3000                            | Facade server port      |
| `CACHE_TTL_SECONDS`  | 60                              | Cache TTL in seconds    |
| `REDIS_URL`          | redis://redis:6379              | Redis URL               |
| `HIS_BASE_URL`       | http://his:4000                 | HIS API base URL        |
| `HIS_CLIENT_ID`      | his-client                      | OAuth Client ID         |
| `HIS_CLIENT_SECRET`  | his-secret                      | OAuth Client Secret     |
| `HIS_ENVIRONMENT`    | TEST                            | HIS environment         |
| `RABBITMQ_URL`       | amqp://guest:guest@rabbitmq:5672| RabbitMQ URL            |
| `FHIR_SERVER_URL`    | http://aidbox:8080              | Aidbox URL              |
| `AIDBOX_CLIENT_ID`   | root                            | Aidbox client ID        |
| `AIDBOX_CLIENT_SECRET`| WdodyB65ij                     | Aidbox client secret    |
| `PREFETCH`           | 10                              | Consumer prefetch count |

## FHIR Mapping

### Patient Mapping

| HIS Field                  | FHIR Patient Field     | Notes                                         |
| -------------------------- | ---------------------- | --------------------------------------------- |
| `patientId`                | `id`, `identifier[0]`  | System: `https://his.example.com/patient-id`   |
| `nationalIdentifier.value` | `identifier[]`         | System: `https://national-registry.example.com/patient-id` |
| `localIdentifier.value`    | `identifier[]`         | System: `https://his.example.com/local-id`     |
| `title.description`        | `name[0].prefix[]`     |                                                |
| `forename`                 | `name[0].given[0]`     |                                                |
| `surname`                  | `name[0].family`       |                                                |
| `gender.description`       | `gender`               | Mapped: Male->male, Female->female             |
| `doB`                      | `birthDate`            | Format: YYYY-MM-DD                             |

### Encounter Mapping

| HIS Field        | FHIR Encounter Field        | Notes                                    |
| ---------------- | --------------------------- | ---------------------------------------- |
| `spellId`        | `id`, `identifier[0]`       | System: `https://his.example.com/spell-id`|
| `patientId`      | `subject.reference`         | `Patient/{patientId}`                    |
| `admissionDate`  | `period.start`              |                                          |
| `status`         | `status`                    | Mapped: discharge->finished, etc.        |
| `wardId`         | `location[0].location.reference` | `Location/{wardId}`                |
| `bedName`        | `location[0].physicalType.text`  | Bed identifier                     |
| `specialtyCode`  | `serviceType.coding[0].code`     |                                    |
| —                | `class.code`                | Fixed: `IMP` (inpatient)                 |

### Location Mapping

| HIS Field  | FHIR Location Field | Notes                                     |
| ---------- | ------------------- | ----------------------------------------- |
| `wardId`   | `id`, `identifier[0]`| System: `https://his.example.com/ward-id` |
| `wardName` | `name`              |                                            |
| `siteName` | `description`       | Combined: "{wardName} at {siteName}"       |
| —          | `physicalType`      | Fixed: `wa` (Ward)                         |

## ADT Event Schema

Events contain full patient and encounter data (fat event pattern):

```json
{
  "eventType": "ADT",
  "action": "admit",
  "timestamp": "2024-01-15T10:30:00Z",
  "patient": {
    "patientId": "patient-001",
    "nationalId": "NAT-9000001",
    "localId": "H100001",
    "title": "Mr",
    "forename": "James",
    "surname": "Wilson",
    "gender": "Male",
    "birthDate": "1990-01-15"
  },
  "encounter": {
    "spellId": "spell-001",
    "wardId": "ward-001",
    "wardName": "Ward 04",
    "siteName": "General Hospital",
    "bedName": "B05",
    "admissionDate": "2024-12-01T15:52:00Z",
    "specialtyCode": "100",
    "specialtyName": "General Surgery"
  }
}
```

## Trade-offs

| Aspect         | Pure Facade               | Event-Driven              |
| -------------- | ------------------------- | ------------------------- |
| Complexity     | Simpler                   | More complex              |
| Infrastructure | Redis                     | RabbitMQ + Aidbox + PG    |
| Data freshness | Cached (60s TTL)          | Real-time                 |
| HIS load       | On cache miss             | Only publishes events     |
| Scalability    | Horizontal (shared cache) | Horizontal (Aidbox + PG)  |

## Project Structure

```
scripts/
└── generate-types.ts        # FHIR type generation config
src/
├── facade/                  # Approach 1: Pure Facade
│   ├── index.ts             # HTTP server (Bun.serve)
│   ├── cache.ts             # Redis TTL cache
│   └── his-server.ts        # Sample HIS API server
│
├── event-driven/            # Approach 2: Event-Driven
│   ├── consumer.ts          # RabbitMQ consumer
│   ├── publisher.ts         # ADT event simulator (testing)
│   └── fhir-client.ts       # Aidbox FHIR client
│
├── shared/                  # Shared code
│   ├── his-client.ts        # HIS API client + OAuth 2.0
│   ├── fhir-mapper.ts       # HIS → FHIR R4 mapping
│   ├── test-data.ts         # Shared test data (7 sample patients)
│   └── types/
│       ├── his.ts           # HIS API types
│       └── events.ts        # ADT event types
│
└── fhir-types/              # Generated FHIR R4 types (do not edit)
    └── hl7-fhir-r4-core/    # Patient, Encounter, Location, Bundle, etc.
```

## Local Development

```bash
# Install dependencies
bun install

# Regenerate FHIR types (Patient, Encounter, Location, Bundle, OperationOutcome)
bun run generate-types

# Run facade service locally
bun run src/facade/index.ts

# Run type check
bun run typecheck

# Simulate ADT events (requires RabbitMQ on localhost:5672)
bun run publish:admit      # 7 admit events
bun run publish:discharge  # 7 discharge events
bun run publish:transfer   # 7 transfer events
```

## FHIR Type Generation

FHIR TypeScript types are generated using [@atomic-ehr/codegen](https://github.com/nicola-ehr/codegen). The generation script at `scripts/generate-types.ts` uses tree-shaking to include only the resource types used in this example:

- **Patient** — mapped from HIS patient data
- **Encounter** — mapped from HIS inpatient/ADT data
- **Location** — mapped from HIS ward data
- **Bundle** — response format for `$get-ward-patients` and FHIR search
- **OperationOutcome** — error responses

To regenerate types (e.g., after adding new resource types to the config):

```bash
bun run generate-types
```

## Dependencies

- [ioredis](https://github.com/redis/ioredis) — Redis client for facade caching
- [amqplib](https://github.com/amqp-node/amqplib) — RabbitMQ client for event-driven architecture
- [@atomic-ehr/codegen](https://github.com/nicola-ehr/codegen) — FHIR type generation (dev dependency)
