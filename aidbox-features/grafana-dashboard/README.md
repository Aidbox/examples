---
features: [observability, monitoring, metrics, grafana, prometheus]
languages: [YAML]
---
# Grafana dashboard for Aidbox metrics

This example demonstrates how to set up Grafana with Prometheus to visualize Aidbox metrics.

## Components

- **Aidbox** - FHIR server with metrics endpoint enabled
- **PostgreSQL** - Database for Aidbox
- **Prometheus** - Metrics collection and storage
- **Grafana** - Metrics visualization with pre-configured Aidbox dashboard

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose

## Quick Start

### 1. Start all services

```shell
docker compose up
```

Wait until all containers are running and healthy.

### 2. Access Aidbox

Open [http://localhost:8080](http://localhost:8080) and log in with:
- Username: `admin`
- Password: `admin`

### 3. Access Grafana

Open [http://localhost:3000](http://localhost:3000) and log in with:
- Username: `admin`
- Password: `password`

Navigate to **Dashboards** to find the pre-configured **Aidbox** dashboard.

### 4. Access Prometheus (optional)

Prometheus is available at [http://localhost:9090](http://localhost:9090) if you want to explore raw metrics.

## Metrics Collection

Prometheus is configured to scrape three Aidbox metrics endpoints:

| Endpoint | Scrape Interval | Description |
|----------|-----------------|-------------|
| `/metrics` | 10s | Real-time metrics |
| `/metrics/minutes` | 1m | Minute-aggregated metrics |
| `/metrics/hours` | 10m | Hour-aggregated metrics |

## Grafana Dashboard

The Grafana container automatically downloads the official [Aidbox dashboard](https://grafana.com/grafana/dashboards/24752) from Grafana.com on startup.
