# Game of Pools - Aidbox Performance Testing Framework

A comprehensive automated performance testing framework for Aidbox FHIR server that systematically tests different configurations of CPU limits, web threads, and database connection pool sizes.

## Overview

This project helps you find optimal Aidbox configuration by:
- Testing multiple CPU, web thread, and DB pool combinations automatically
- Simulating realistic FHIR workloads with complex resource relationships
- Measuring throughput (RPS) and latency (P99, P95, avg)
- Generating detailed analysis reports and visualizations

## Prerequisites

- Docker and Docker Compose
- Python 3.8+
- K6 load testing tool
- At least 8GB RAM (16GB recommended)
- Fast storage (NVMe SSD recommended)

## Project Structure

```
.
├── docker-compose.yaml           # Main Docker Compose configuration
├── docker-compose.override.yml   # Generated per-test configuration
├── init-bundle.json              # Aidbox initialization bundle
├── performance_test.py           # Main test orchestration script
├── analyze_results.py            # Results analysis script
├── summarize_results.py          # Generate visualizations
├── k6/                           # K6 load test scripts
│   ├── crud.js                   # Main CRUD test scenario
│   ├── prewarm.js                # Cache warmup script
│   ├── util.js                   # Utility functions
│   └── seed/                     # FHIR resource templates
│       ├── patient.js
│       ├── encounter.js
│       ├── observation.js
│       └── ...
├── result/                       # Raw test results (JSON)
├── analysis/                     # Analysis reports (CSV, SVG)
├── prometheus/                   # Prometheus configuration
└── grafana/                      # Grafana dashboards
```

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd game-of-pools
```

### 2. Configure Test Parameters

Edit `performance_test.py` to set your test parameters:

```python
# Test parameters
CPU_LIMITS = [2, 4, 6, 8]                    # CPU core limits to test
WEB_THREAD_MULTIPLIERS = [1, 1.5, 2, 2.5, 3]  # Web thread multipliers
DB_POOL_MULTIPLIERS = [1.5, 2, 2.5, 3]        # DB pool multipliers
```

**For a quick test** (recommended for first run):
```python
CPU_LIMITS = [2]
WEB_THREAD_MULTIPLIERS = [1, 1.5, 2]
DB_POOL_MULTIPLIERS = [1.5, 2]
```

### 3. Run Performance Tests

```bash
python3 performance_test.py
```

This will:
- Start Docker Compose services (Aidbox, PostgreSQL, Prometheus, Grafana)
- Run through all configuration combinations
- Save results to `./result/` directory
- Take approximately 1 hour per CPU limit (5 min per config + overhead)

**Note:** Services remain running after tests complete for analysis.

### 4. Analyze Results

```bash
python3 analyze_results.py
```

This generates:
- `analysis/cpu_X_avg_rps.csv` - RPS matrices per CPU count
- `analysis/cpu_X_p99_latency.csv` - Latency matrices per CPU count
- `analysis/summary_all_tests.csv` - Complete results table
- `analysis/best_configurations.csv` - Optimal configs per CPU

## Monitoring During Tests

### Grafana Dashboard

Access Grafana at http://localhost:3000
- **Username:** admin
- **Password:** password

The pre-configured Aidbox dashboard shows:
- Request rates and latency percentiles
- Database connection pool usage
- CPU and memory utilization
- FHIR operation breakdown

### Prometheus

Access Prometheus at http://localhost:9090

Useful queries:
```promql
# Request rate
rate(http_requests_total[5m])

# P99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# DB pool utilization
db_pool_active_connections / db_pool_max_connections
```


## Understanding Test Results

### Best Configurations CSV

```csv
CPU Limit,Metric,Best Web Threads,Best DB Pool Size,Value
2,Best RPS,3,4,1596.15
2,Best P99 Latency,2,5,6.02
```

- **Best RPS**: Configuration with highest throughput
- **Best P99 Latency**: Configuration with lowest 99th percentile latency

### RPS Matrix (example for 4 CPUs)

```
Web Threads / DB Pool | 6       | 8       | 10      | 12
---------------------|---------|---------|---------|--------
4                    | 2694.48 | 2705.79 | 2747.58 | 2697.15
6                    | -       | -       | -       | 3094.02
8                    | -       | -       | -       | 2718.51
```

- Rows: Web thread counts
- Columns: DB pool sizes
- Values: Requests per second (RPS)
- `-`: Configuration not tested

## Customizing Tests

### Modify Test Duration

Edit `k6/crud.js`:

```javascript
export const options = {
  scenarios: {
    crud: {
      executor: 'constant-vus',
      vus: __ENV.K6_VUS || 300,
      duration: '5m',  // Change this (e.g., '10m', '1h')
      gracefulStop: '30s',
    },
  },
}
```

### Adjust Virtual Users

The framework automatically sets VUs to 2x web threads. To override:

```bash
K6_VUS=100 python3 performance_test.py
```

### Test Specific Configuration

To test a single configuration:

```python
# In performance_test.py
CPU_LIMITS = [4]
WEB_THREAD_MULTIPLIERS = [1.5]
DB_POOL_MULTIPLIERS = [2]
```

Or manually create `docker-compose.override.yml`:

```yaml
services:
  aidbox:
    environment:
      BOX_WEB_THREAD: "6"
      BOX_DB_POOL_MAXIMUM_POOL_SIZE: "12"
    deploy:
      resources:
        limits:
          cpus: "4"
```

Then run K6 directly:

```bash
docker compose up -d --wait
k6 run k6/prewarm.js
k6 run --summary-export=result.json k6/crud.js
```

### Add Custom FHIR Resources

1. Create a new seed file in `k6/seed/`:

```javascript
// k6/seed/procedure.js
export default {
  "resourceType": "Procedure",
  "status": "completed",
  // ... your resource structure
}
```

2. Import and use in `k6/crud.js`:

```javascript
import procedure from './seed/procedure.js'

export function setup() {
  return {
    seeds: {
      procedure: JSON.stringify(procedure),
      // ... other seeds
    }
  }
}
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs aidbox
docker compose logs postgres

# Restart services
docker compose down
docker compose up -d --wait
```

## Performance Tips

### For Faster Testing

1. **Reduce test duration**: Edit `k6/crud.js` to use `duration: '2m'`
2. **Test fewer configurations**: Reduce multiplier arrays
3. **Use local storage**: Ensure Docker volumes are on fast SSD
4. **Allocate more resources**: Increase Docker Desktop memory limit

### For Production-Like Testing

1. **Use realistic data volumes**: Pre-populate database with test data
2. **Match production hardware**: Test on similar CPU/memory specs
3. **Include background load**: Run maintenance tasks during tests
4. **Test with real network latency**: Use remote database

## Results Interpretation

### Choosing Configuration

**For maximum throughput:**
- Use 1.5x CPU for web threads
- Use 2-2.5x threads for DB pool
- Example: 4 CPUs → 6 threads, 12 pool → 3,094 RPS

**For low latency:**
- Use 1x CPU for web threads
- Use 1.5-2x threads for DB pool
- Example: 4 CPUs → 4 threads, 8 pool → 6.12ms P99

**For balanced:**
- Use 1.5x CPU for web threads
- Use 2x threads for DB pool
- Best for most production deployments

