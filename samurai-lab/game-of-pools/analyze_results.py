#!/usr/bin/env python3
"""
Analyze performance test results and generate CSV reports.
Creates one CSV file per CPU count with web threads as rows and DB pool sizes as columns.
"""

import json
import csv
from pathlib import Path
from collections import defaultdict


RESULTS_DIR = Path("./result")
ANALYSIS_DIR = Path("./analysis")


def load_test_results():
    """Load all test result JSON files."""
    results = []
    
    for json_file in RESULTS_DIR.glob("test_*.json"):
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
                results.append(data)
        except Exception as e:
            print(f"⚠ Error loading {json_file}: {e}")
    
    return results


def organize_results_by_cpu(results):
    """Organize results by CPU count."""
    organized = defaultdict(list)
    
    for result in results:
        config = result.get("configuration", {})
        cpu_limit = config.get("cpu_limit")
        
        if cpu_limit:
            organized[cpu_limit].append(result)
    
    return organized


def create_csv_for_cpu(cpu_limit, results, metric_name, metric_key):
    """Create a CSV file for a specific CPU count and metric."""
    # Organize data by web_threads (rows) and db_pool_size (columns)
    data_matrix = defaultdict(dict)
    web_threads_set = set()
    db_pool_set = set()
    
    for result in results:
        config = result.get("configuration", {})
        web_threads = config.get("web_threads")
        db_pool_size = config.get("db_pool_size")
        
        k6_results = result.get("k6_results", {})
        metric_value = k6_results.get(metric_key)
        
        if web_threads and db_pool_size and metric_value is not None:
            data_matrix[web_threads][db_pool_size] = metric_value
            web_threads_set.add(web_threads)
            db_pool_set.add(db_pool_size)
    
    # Sort rows and columns
    web_threads_sorted = sorted(web_threads_set)
    db_pool_sorted = sorted(db_pool_set)
    
    # Create CSV file
    ANALYSIS_DIR.mkdir(exist_ok=True)
    csv_filename = ANALYSIS_DIR / f"cpu_{cpu_limit}_{metric_name}.csv"
    
    with open(csv_filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        
        # Header row: DB Pool sizes
        header = ["Web Threads / DB Pool"] + [str(db) for db in db_pool_sorted]
        writer.writerow(header)
        
        # Data rows
        for web_threads in web_threads_sorted:
            row = [str(web_threads)]
            for db_pool in db_pool_sorted:
                value = data_matrix[web_threads].get(db_pool, "")
                row.append(value if value != "" else "N/A")
            writer.writerow(row)
    
    print(f"  ✓ Created {csv_filename}")
    return csv_filename


def generate_summary_report(results):
    """Generate a summary report with all configurations."""
    ANALYSIS_DIR.mkdir(exist_ok=True)
    summary_file = ANALYSIS_DIR / "summary_all_tests.csv"
    
    with open(summary_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        
        # Header
        writer.writerow([
            "CPU Limit",
            "Web Threads",
            "DB Pool Size",
            "Avg RPS",
            "P99 Latency (ms)",
            "P95 Latency (ms)",
            "Avg Latency (ms)",
            "Total Requests"
        ])
        
        # Sort results by CPU, then web threads, then DB pool
        sorted_results = sorted(
            results,
            key=lambda x: (
                x.get("configuration", {}).get("cpu_limit", 0),
                x.get("configuration", {}).get("web_threads", 0),
                x.get("configuration", {}).get("db_pool_size", 0)
            )
        )
        
        # Data rows
        for result in sorted_results:
            config = result.get("configuration", {})
            k6_results = result.get("k6_results", {})
            
            row = [
                config.get("cpu_limit", "N/A"),
                config.get("web_threads", "N/A"),
                config.get("db_pool_size", "N/A"),
                k6_results.get("avg_rps", "N/A"),
                k6_results.get("p99_latency_ms", "N/A"),
                k6_results.get("p95_latency_ms", "N/A"),
                k6_results.get("avg_latency_ms", "N/A"),
                k6_results.get("raw_metrics", {}).get("total_requests", "N/A")
            ]
            writer.writerow(row)
    
    print(f"  ✓ Created {summary_file}")
    return summary_file


def find_best_configurations(results):
    """Find best configurations for each CPU count."""
    organized = organize_results_by_cpu(results)
    
    ANALYSIS_DIR.mkdir(exist_ok=True)
    best_file = ANALYSIS_DIR / "best_configurations.csv"
    
    with open(best_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        
        # Header
        writer.writerow([
            "CPU Limit",
            "Metric",
            "Best Web Threads",
            "Best DB Pool Size",
            "Value"
        ])
        
        for cpu_limit in sorted(organized.keys()):
            cpu_results = organized[cpu_limit]
            
            # Find best RPS
            best_rps = max(
                cpu_results,
                key=lambda x: x.get("k6_results", {}).get("avg_rps", 0) or 0
            )
            best_rps_config = best_rps.get("configuration", {})
            best_rps_value = best_rps.get("k6_results", {}).get("avg_rps", "N/A")
            
            writer.writerow([
                cpu_limit,
                "Best RPS",
                best_rps_config.get("web_threads", "N/A"),
                best_rps_config.get("db_pool_size", "N/A"),
                best_rps_value
            ])
            
            # Find best (lowest) P99 latency
            valid_p99_results = [
                r for r in cpu_results
                if r.get("k6_results", {}).get("p99_latency_ms") is not None
            ]
            
            if valid_p99_results:
                best_p99 = min(
                    valid_p99_results,
                    key=lambda x: x.get("k6_results", {}).get("p99_latency_ms", float('inf'))
                )
                best_p99_config = best_p99.get("configuration", {})
                best_p99_value = best_p99.get("k6_results", {}).get("p99_latency_ms", "N/A")
                
                writer.writerow([
                    cpu_limit,
                    "Best P99 Latency",
                    best_p99_config.get("web_threads", "N/A"),
                    best_p99_config.get("db_pool_size", "N/A"),
                    best_p99_value
                ])
    
    print(f"  ✓ Created {best_file}")
    return best_file


def main():
    """Analyze test results and generate reports."""
    print("\n" + "="*80)
    print("PERFORMANCE TEST RESULTS ANALYSIS")
    print("="*80 + "\n")
    
    # Load results
    print("📂 Loading test results...")
    results = load_test_results()
    print(f"  ✓ Loaded {len(results)} test results\n")
    
    if not results:
        print("✗ No test results found in ./result directory")
        return
    
    # Organize by CPU
    organized = organize_results_by_cpu(results)
    
    # Generate CSV files for each CPU count and metric
    print("📊 Generating CSV files per CPU count...\n")
    
    metrics = [
        ("avg_rps", "avg_rps"),
        ("p99_latency", "p99_latency_ms"),
        ("p95_latency", "p95_latency_ms"),
        ("avg_latency", "avg_latency_ms")
    ]
    
    for cpu_limit in sorted(organized.keys()):
        print(f"CPU Limit: {cpu_limit}")
        cpu_results = organized[cpu_limit]
        
        for metric_name, metric_key in metrics:
            create_csv_for_cpu(cpu_limit, cpu_results, metric_name, metric_key)
        print()
    
    # Generate summary report
    print("📋 Generating summary report...")
    generate_summary_report(results)
    print()
    
    # Find best configurations
    print("🏆 Finding best configurations...")
    find_best_configurations(results)
    print()
    
    print("="*80)
    print("ANALYSIS COMPLETED")
    print("="*80)
    print(f"Reports saved in: {ANALYSIS_DIR}")
    print("\nGenerated files:")
    print("  - cpu_X_<metric>.csv - Matrix view for each CPU and metric")
    print("  - summary_all_tests.csv - All test results in one file")
    print("  - best_configurations.csv - Best configs for each CPU count")


if __name__ == "__main__":
    main()
