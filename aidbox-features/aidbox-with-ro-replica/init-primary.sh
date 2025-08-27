#!/bin/bash
set -e

# Configuration for PostgreSQL primary server
cat >> ${PGDATA}/postgresql.conf << EOF
# Replication Configuration
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1GB
hot_standby = on
EOF

# Create pg_hba.conf entries for replication
cat >> ${PGDATA}/pg_hba.conf << EOF
# Replication Connection
host replication replicator 0.0.0.0/0 md5
host replication replicator samenet md5
EOF

# Create replication user and slot when PostgreSQL is ready
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" << EOF
-- Create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secret';

-- Create a physical replication slot
SELECT pg_create_physical_replication_slot('replica_slot');

-- Create a test table to verify replication
CREATE TABLE test_replication (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert some test data
INSERT INTO test_replication (data) VALUES ('Test data from primary');
EOF

echo "Primary PostgreSQL server has been configured for replication"
