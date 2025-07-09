#!/bin/bash
set -e

# Wait for the primary to be ready (additional safety)
until PGPASSWORD=secret psql -h postgres_primary -U aidbox -d aidbox -c '\q'; do
  echo "Waiting for primary PostgreSQL server to be ready..."
  sleep 5
done

# Stop PostgreSQL
pg_ctl -D "$PGDATA" -m fast -w stop

# Remove existing data (fresh replica setup)
rm -rf $PGDATA/*

# Initialize replica using pg_basebackup without trying to create a new slot
pg_basebackup -h postgres_primary -p 5432 -U replicator -D $PGDATA -P -v -R -X stream -W << EOF
secret
EOF

# Create or append to recovery.conf (for PostgreSQL 12+ this goes in postgresql.conf and standby.signal)
if [ -f $PGDATA/postgresql.conf ]; then
  # PostgreSQL 12+
  touch $PGDATA/standby.signal
  cat >> $PGDATA/postgresql.conf << EOF
# Replication Configuration
primary_conninfo = 'host=postgres_primary port=5432 user=replicator password=secret application_name=replica1'
primary_slot_name = 'replica_slot'
hot_standby = on
hot_standby_feedback = on
EOF
else
  # Older PostgreSQL versions
  cat > $PGDATA/recovery.conf << EOF
standby_mode = 'on'
primary_conninfo = 'host=postgres_primary port=5432 user=replicator password=secret application_name=replica1'
primary_slot_name = 'replica_slot'
hot_standby = on
hot_standby_feedback = on
EOF
fi

# Start PostgreSQL
pg_ctl -D "$PGDATA" -w start

echo "PostgreSQL replica has been configured"
