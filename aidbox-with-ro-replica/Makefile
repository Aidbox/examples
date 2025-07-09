# Makefile for testing PostgreSQL read-only replica configuration
.PHONY: test up down all

# Single test target that does everything
test: up test-run down
	@echo "Test completed."

up:
	@echo "Starting PostgreSQL read-only replica test..."
	@echo "Cleaning up any existing containers and volumes..."
	docker-compose down -v 2>/dev/null || true
	@echo "Removing volume data to ensure init scripts run..."
	docker volume rm read-only-replica_postgres_primary_data read-only-replica_postgres_replica_data 2>/dev/null || true

	@echo "Setting execute permissions on scripts..."
	chmod +x init-primary.sh init-replica.sh test-replication.sh

	@echo "Starting containers..."
	docker-compose up --wait

	@echo "Container status:"
	docker-compose ps

test-run:
	@echo "Testing replication..."
	@TERM=dumb ./test-replication.sh

	@echo "Checking replication status details:"
	@docker exec postgres_primary psql -U aidbox -d aidbox -c "SELECT pid, usename, application_name, client_addr, state, sync_state FROM pg_stat_replication;"

	@echo "Verifying data in replica:"
	@docker exec postgres_replica psql -U aidbox -d aidbox -c "SELECT * FROM test_replication ORDER BY id;"

down:
	@echo "Cleaning up containers..."
	docker-compose down -v
