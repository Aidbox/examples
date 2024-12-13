.PHONY: format-fix lint

all: format-fix lint

format-fix:
	ruff format

lint:
	ruff check

mypy:
	mypy --strict *.py

pyright:
	pyright *.py

type-check: mypy pyright
