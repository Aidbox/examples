ENV ?= dev

.PHONY: build up down clean logs

build:
	./build-ig.sh
	./build-init-bundle.sh $(ENV)

up: build
	docker compose up

down:
	docker compose down

clean:
	docker compose down -v
	rm -rf dist

logs:
	docker compose logs -f aidbox
