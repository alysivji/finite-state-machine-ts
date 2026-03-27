TARGETS := $(shell awk 'BEGIN { FS = ":" } /^[A-Za-z0-9_.-]+:.*\#\# / { print $$1 }' $(MAKEFILE_LIST))

.PHONY: $(TARGETS)

help: ## Show available targets
	@awk 'BEGIN { FS = ":.*## " } /^[A-Za-z0-9_.-]+:.*## / { printf "%-16s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

build: ## Build the package
	npm run build

test: ## Run the test suite
	npm run test

test-coverage: ## Run the test suite with coverage
	npm run test:coverage
