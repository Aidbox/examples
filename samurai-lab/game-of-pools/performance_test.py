#!/usr/bin/env python3
"""
Performance testing script for Aidbox with different configurations.
Tests various combinations of CPU limits, web threads, and DB pool sizes.
"""

import os
import sys
import yaml
import subprocess
from pathlib import Path
import json
from datetime import datetime


# Test parameters
CPU_LIMITS = [2, 4, 6, 8]
WEB_THREAD_MULTIPLIERS = [1, 1.5, 2, 2.5, 3]
DB_POOL_MULTIPLIERS = [1.5, 2, 2.5, 3]

BASE_DIR = Path(".")
OVERRIDE_FILE = BASE_DIR / "docker-compose.override.yml"
RESULTS_DIR = BASE_DIR / "result"


def generate_test_configurations():
    """Generate all test configurations"""
    configurations = []
    
    for cpu_limit in CPU_LIMITS:
        for web_multiplier in WEB_THREAD_MULTIPLIERS:
            web_threads = round(cpu_limit * web_multiplier)
            
            for db_multiplier in DB_POOL_MULTIPLIERS:
                db_pool_size = round(web_threads * db_multiplier) 
                
                config = {
                    "cpu_limit": cpu_limit,
                    "web_threads": web_threads,
                    "db_pool_size": db_pool_size,
                }
                configurations.append(config)
    
    return configurations


def write_override_file(config):
    """Override docker-compose.override.yml."""
    # Generate BOX_NAME from configuration
    box_name = f"cpu_{config['cpu_limit']}__web_{config['web_threads']}__db_{config['db_pool_size']}"
    
    override_config = {
        "services": {
            "aidbox": {
                "environment": {
                    "BOX_INSTANCE_NAME": box_name,
                    "BOX_WEB_THREAD": str(config["web_threads"]),
                    "BOX_DB_POOL_MAXIMUM_POOL_SIZE": str(config["db_pool_size"]),
                },
                "deploy": {
                    "resources": {
                        "limits": {
                            "cpus": str(config["cpu_limit"])
                        }
                    }
                }
            }
        }
    }
    
    with open(OVERRIDE_FILE, 'w') as f:
        yaml.dump(override_config, f, default_flow_style=False, sort_keys=False)


def docker_compose_down():
    """Stop and remove docker compose services."""
    print("\n Stopping docker compose...")
    try:
        subprocess.run(
            # ["docker", "compose", "down", "-v"],
            ["docker", "compose", "down"],
            cwd=BASE_DIR,
            check=True,
            capture_output=True,
            text=True
        )
        print(" Docker compose stopped")
    except subprocess.CalledProcessError as e:
        print(f" Warning: docker compose down failed: {e.stderr}")


def docker_compose_up():
    """Start docker compose services and wait for them to be healthy."""
    print("\n🚀 Starting docker compose and waiting for services to be healthy...")
    try:
        subprocess.run(
            ["docker", "compose", "up", "-d", "--wait"],
            cwd=BASE_DIR,
            check=True,
            capture_output=True,
            text=True
        )
        print("✓ Docker compose started and services are healthy")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Error starting docker compose: {e.stderr}")
        return False


def restart_aidbox():
    """Restart only the aidbox service and wait for it to be healthy."""
    print("\n🔄 Restarting aidbox service...")
    try:
        subprocess.run(
            ["docker", "compose", "restart", "aidbox"],
            cwd=BASE_DIR,
            check=True,
            capture_output=True,
            text=True
        )
        # Wait for aidbox to be healthy
        subprocess.run(
            ["docker", "compose", "up", "-d", "--wait", "aidbox"],
            cwd=BASE_DIR,
            check=True,
            capture_output=True,
            text=True
        )
        print("✓ Aidbox restarted and healthy")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Error restarting aidbox: {e.stderr}")
        return False


def run_k6_test(config):
    """Run K6 performance tests: prewarm and crud."""
    print("\n📊 Running K6 performance tests...")
    
    # Generate unique filename for K6 results
    k6_result_file = f"./result/k6_cpu{config['cpu_limit']}_wt{config['web_threads']}_db{config['db_pool_size']}.json"
    
    # Step 1: Run prewarm test
    print("  Running prewarm test...")
    try:
        subprocess.run(
            ["k6", "run", "k6/prewarm.js"],
            cwd=BASE_DIR,
            check=True,
            capture_output=True,
            text=True
        )
        print("  ✓ Prewarm completed")
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Prewarm failed: {e.stderr}")
        return {
            "status": "failed",
            "error": "prewarm failed",
            "details": e.stderr
        }
    
    # Step 2: Run crud test with summary export
    print("  Running CRUD test...")
    try:
        # Set K6_VUS to 2x the number of web workers
        k6_vus = config['web_threads'] * 2
        env = os.environ.copy()
        env['K6_VUS'] = str(k6_vus)
        
        result = subprocess.run(
            [
                "k6", "run",
                "--summary-export", k6_result_file,
                "--summary-trend-stats", "avg,min,med,max,p(90),p(95),p(99)",
                "k6/crud.js"
            ],
            cwd=BASE_DIR,
            check=True,
            capture_output=True,
            text=True,
            env=env
        )
        print("  ✓ CRUD test completed")
    except subprocess.CalledProcessError as e:
        print(f"  ✗ CRUD test failed: {e.stderr}")
        return {
            "status": "failed",
            "error": "crud test failed",
            "details": e.stderr
        }
    
    # Step 3: Parse K6 summary results
    metrics = parse_k6_summary(k6_result_file)
    
    print(f"  Average RPS: {metrics.get('avg_rps', 'N/A')}")
    print(f"  P99 Latency: {metrics.get('p99_latency_ms', 'N/A')} ms")
    
    return {
        "status": "success",
        "avg_rps": metrics.get("avg_rps"),
        "p99_latency_ms": metrics.get("p99_latency_ms"),
        "raw_metrics": metrics
    }


def parse_k6_summary(json_file):
    """Parse K6 summary JSON to extract average RPS and P99 latency."""
    try:
        with open(json_file, 'r') as f:
            summary = json.load(f)
        
        # Metrics are at the root level, not nested under "metrics"
        metrics = summary.get("metrics", summary)
        
        # Get http_reqs rate (RPS)
        http_reqs = metrics.get("http_reqs", {})
        avg_rps = http_reqs.get("rate")
        total_requests = http_reqs.get("count")
        
        # Get http_req_duration P99 (in milliseconds)
        http_req_duration = metrics.get("http_req_duration", {})
        p99_latency = http_req_duration.get("p(99)")
        p95_latency = http_req_duration.get("p(95)")
        avg_latency = http_req_duration.get("avg")
        
        return {
            "avg_rps": round(avg_rps, 2) if avg_rps else None,
            "p99_latency_ms": round(p99_latency, 2) if p99_latency else None,
            "p95_latency_ms": round(p95_latency, 2) if p95_latency else None,
            "avg_latency_ms": round(avg_latency, 2) if avg_latency else None,
            "total_requests": total_requests,
        }
    
    except FileNotFoundError:
        print(f"  ✗ K6 summary file not found: {json_file}")
        return {}
    except Exception as e:
        print(f"  ✗ Error parsing K6 summary: {e}")
        return {}


def save_test_result(config, k6_result):
    """Save test results to a JSON file."""
    RESULTS_DIR.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"test_cpu{config['cpu_limit']}_wt{config['web_threads']}_db{config['db_pool_size']}_{timestamp}.json"
    filepath = RESULTS_DIR / filename
    
    result = {
        "timestamp": timestamp,
        "configuration": config,
        "k6_results": k6_result
    }
    
    with open(filepath, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"✓ Results saved to {filepath}")


def run_single_test(config, test_number, total_tests):
    """Run a single test with the given configuration."""
    print("\n" + "="*80)
    print(f"TEST {test_number}/{total_tests}")
    print("="*80)
    print(f"Configuration:")
    print(f"  CPU Limit: {config['cpu_limit']}")
    print(f"  Web Threads: {config['web_threads']}")
    print(f"  DB Pool Size: {config['db_pool_size']}")
    
    # Update override file
    write_override_file(config)
    
    # Restart only aidbox service with new configuration
    if not restart_aidbox():
        print("✗ Failed to restart aidbox, skipping test")
        return
    
    # Run K6 test
    k6_result = run_k6_test(config)
    
    # Save results
    save_test_result(config, k6_result)
    
    print(f"\n✓ Test {test_number}/{total_tests} completed")


def main():
    """Run all test configurations."""
    configurations = generate_test_configurations()
    total_tests = len(configurations)
    
    print(f"\n{'='*80}")
    print(f"PERFORMANCE TEST SUITE")
    print(f"{'='*80}")
    print(f"Total test configurations: {total_tests}")
    print(f"CPU limits: {CPU_LIMITS}")
    print(f"Web thread multipliers: {WEB_THREAD_MULTIPLIERS}")
    print(f"DB pool multipliers: {DB_POOL_MULTIPLIERS}")
    print(f"Results will be saved to: {RESULTS_DIR}")
    print(f"{'='*80}\n")
    
    # Start docker compose once at the beginning
    print("🔧 Initial setup: Starting all services...")
    if not docker_compose_up():
        print("✗ Failed to start docker compose, exiting")
        sys.exit(1)
    
    for i, config in enumerate(configurations, 1):
        try:
            run_single_test(config, i, total_tests)
        except KeyboardInterrupt:
            print("\n\n⚠ Test interrupted by user")
            print("Docker compose services are still running")
            sys.exit(1)
        except Exception as e:
            print(f"\n✗ Error running test: {e}")
            print("Continuing to next test...")
            continue
    
    print("\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)
    print(f"Results saved in: {RESULTS_DIR}")
    print("\n💡 Docker compose services are still running")
    print("   To stop them, run: docker compose down")


if __name__ == "__main__":
    main()
