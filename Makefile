TARGETS := $(shell awk 'BEGIN { FS = ":" } /^[A-Za-z0-9_.-]+:.*\#\# / { print $$1 }' $(MAKEFILE_LIST))

.PHONY: $(TARGETS)

help: ## Show available targets
	@awk 'BEGIN { FS = ":.*## " } /^[A-Za-z0-9_.-]+:.*## / { printf "%-16s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

install-hooks: ## Install pre-commit hooks
	pre-commit install

build: ## Build the package
	npm run build

check: ## Run formatting and linting checks
	npm run check

test: ## Run the test suite
	npm run test

test-coverage: ## Run the test suite with coverage
	npm run test:coverage

typecheck: ## Run the TypeScript type checker without emitting files
	npm run typecheck

pre-commit: ## Run pre-commit hooks across the repository
	pre-commit run --all-files
