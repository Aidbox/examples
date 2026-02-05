#!/usr/bin/env python3
"""
Summarize performance test results into transposed tables with multipliers.
Creates separate CSV files for throughput and 99p latency for each CPU count.
"""

import csv
from pathlib import Path
from collections import defaultdict

# Test parameters from performance_test.py
CPU_LIMITS = [2, 4, 6, 8]
WEB_THREAD_MULTIPLIERS = [1, 1.5, 2, 2.5, 3]
DB_POOL_MULTIPLIERS = [1.5, 2, 2.5, 3]

ANALYSIS_DIR = Path("analysis")
SUMMARY_FILE = ANALYSIS_DIR / "summary_all_tests.csv"


def find_closest_multiplier(value, multipliers):
    """Find the closest multiplier from the list."""
    return min(multipliers, key=lambda x: abs(x - value))


def load_test_results():
    """Load test results from summary CSV file."""
    results = defaultdict(lambda: defaultdict(dict))
    
    with open(SUMMARY_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cpu_limit = int(row['CPU Limit'])
            web_threads = int(row['Web Threads'])
            db_pool_size = int(row['DB Pool Size'])
            avg_rps = float(row['Avg RPS'])
            p99_latency = float(row['P99 Latency (ms)'])
            
            # Calculate actual multipliers
            web_mult_actual = web_threads / cpu_limit
            db_mult_actual = db_pool_size / web_threads
            
            # Find closest expected multipliers
            web_mult = find_closest_multiplier(web_mult_actual, WEB_THREAD_MULTIPLIERS)
            db_mult = find_closest_multiplier(db_mult_actual, DB_POOL_MULTIPLIERS)
            
            # Store results indexed by CPU, then by multipliers
            results[cpu_limit][(web_mult, db_mult)] = {
                'avg_rps': avg_rps,
                'p99_latency': p99_latency
            }
    
    return results


def create_transposed_table(cpu_limit, results, metric):
    """Create a transposed table for a specific CPU limit and metric."""
    # Use the expected multipliers from the test configuration
    web_mults = WEB_THREAD_MULTIPLIERS
    db_mults = DB_POOL_MULTIPLIERS
    
    # Create header row
    header = ['DB \\ WEB Pool multiplier'] + [f'WEB {web_mult} X CPU' for web_mult in web_mults]
    
    # Create data rows
    rows = [header]
    for db_mult in db_mults:
        row = [str(db_mult)]
        for web_mult in web_mults:
            if (web_mult, db_mult) in results:
                value = results[(web_mult, db_mult)][metric]
                row.append(str(int(round(value))))
            else:
                row.append('N/A')
        rows.append(row)
    
    return rows


def save_csv(filename, rows):
    """Save rows to a CSV file."""
    ANALYSIS_DIR.mkdir(exist_ok=True)
    filepath = ANALYSIS_DIR / filename
    
    with open(filepath, 'w', newline='') as f:
        writer = csv.writer(f, delimiter=',')
        writer.writerows(rows)
    
    print(f"✓ Saved {filepath}")


def main():
    """Generate summary CSV files for each CPU count."""
    print("Loading test results...")
    all_results = load_test_results()
    
    print(f"\nGenerating summary tables for {len(CPU_LIMITS)} CPU configurations...")
    
    for cpu_limit in CPU_LIMITS:
        if cpu_limit not in all_results:
            print(f"⚠ No results found for CPU {cpu_limit}")
            continue
        
        results = all_results[cpu_limit]
        
        # Generate throughput table
        throughput_table = create_transposed_table(cpu_limit, results, 'avg_rps')
        throughput_filename = f"cpu_{cpu_limit}_throughput.csv"
        save_csv(throughput_filename, throughput_table)
        
        # Generate 99p latency table
        latency_table = create_transposed_table(cpu_limit, results, 'p99_latency')
        latency_filename = f"cpu_{cpu_limit}_p99_latency.csv"
        save_csv(latency_filename, latency_table)
    
    print("\n✓ All summary tables generated successfully!")
    print(f"Files saved in: {ANALYSIS_DIR}")


if __name__ == "__main__":
    main()
