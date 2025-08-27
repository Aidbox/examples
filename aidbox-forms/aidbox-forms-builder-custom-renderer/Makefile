# Development commands

.PHONY: dev prod build clean logs restart

# Development mode with file watching
dev:
	docker-compose -f docker-compose.dev.yml up -d

# Production mode
prod:
	docker-compose up -d

# Build containers
build:
	docker-compose build

# Clean up
clean:
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v

# View logs
logs:
	docker-compose logs -f

# View dev logs
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Restart services
restart:
	docker-compose restart

# Restart dev services
dev-restart:
	docker-compose -f docker-compose.dev.yml restart

# Stop all
stop:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down