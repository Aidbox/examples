#!/bin/bash
set -e

echo "=== PostgreSQL Replication Test Script ==="
echo "This script tests replication between PostgreSQL primary and replica"

# Wait for services to be fully ready
echo
echo "Waiting for PostgreSQL services to be fully initialized..."
sleep 10

# Test connection to primary
echo
echo "=== Testing connection to primary (port 5432) ==="
if PGPASSWORD=secret psql -h localhost -p 5432 -U aidbox -d aidbox -c "SELECT version();" > /dev/null 2>&1; then
  echo "✅ Successfully connected to primary PostgreSQL server"
else
  echo "❌ Failed to connect to primary PostgreSQL server"
  exit 1
fi

# Test connection to replica
echo
echo "=== Testing connection to replica (port 5433) ==="
if PGPASSWORD=secret psql -h localhost -p 5433 -U aidbox -d aidbox -c "SELECT version();" > /dev/null 2>&1; then
  echo "✅ Successfully connected to replica PostgreSQL server"
else
  echo "❌ Failed to connect to replica PostgreSQL server"
  exit 1
fi

# Check if test_replication table exists on primary
echo
echo "=== Checking if test_replication table exists on primary ==="
if PGPASSWORD=secret psql -h localhost -p 5432 -U aidbox -d aidbox -c "SELECT count(*) FROM test_replication;" > /dev/null 2>&1; then
  echo "✅ test_replication table exists on primary"
else
  echo "❌ test_replication table doesn't exist on primary"
  exit 1
fi

# Check if test_replication table is replicated to the replica
echo
echo "=== Checking if test_replication table is replicated to replica ==="
if PGPASSWORD=secret psql -h localhost -p 5433 -U aidbox -d aidbox -c "SELECT count(*) FROM test_replication;" > /dev/null 2>&1; then
  echo "✅ test_replication table exists on replica"
else
  echo "❌ test_replication table doesn't exist on replica"
  exit 1
fi

# Insert new data on primary
echo
echo "=== Inserting new data on primary ==="
PGPASSWORD=secret psql -h localhost -p 5432 -U aidbox -d aidbox -c "INSERT INTO test_replication (data) VALUES ('New test data') RETURNING id, data;"
echo "✅ Inserted new data on primary"

# Give replication a moment to catch up
echo "Waiting for replication to sync..."
sleep 5

# Try to read the new data from replica
echo
echo "=== Reading data from replica ==="
REPLICA_DATA=$(PGPASSWORD=secret psql -h localhost -p 5433 -U aidbox -d aidbox -t -c "SELECT COUNT(*) FROM test_replication WHERE data = 'New test data';")
REPLICA_DATA=$(echo $REPLICA_DATA | tr -d '[:space:]')

if [ "$REPLICA_DATA" -gt "0" ]; then
  echo "✅ Successfully verified that new data was replicated to the replica"
else
  echo "❌ Replication test failed. New data not found on replica."
  exit 1
fi

# Verify read-only status of replica
echo
echo "=== Verifying replica is read-only ==="
if PGPASSWORD=secret psql -h localhost -p 5433 -U aidbox -d aidbox -c "INSERT INTO test_replication (data) VALUES ('This should fail');" 2>&1 | grep -q "read-only"; then
  echo "✅ Confirmed replica is in read-only mode"
else
  echo "❌ Replica is not in read-only mode as expected"
  exit 1
fi

echo
echo "=== Replication Test Summary ==="
echo "✅ All tests passed! PostgreSQL replication is working correctly"
echo "Primary is accepting writes at localhost:5432"
echo "Replica is providing read-only access at localhost:5433"
