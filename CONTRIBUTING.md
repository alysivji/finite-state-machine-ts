# Contributing

Thanks for contributing to `finite-state-machine-ts`.

## Local Setup

This project uses `make` as the main task entry point.

```bash
make install
pre-commit install
```

If you do not already have `pre-commit` installed:

```bash
python3 -m pip install pre-commit
```

## Common Commands

```bash
make check
make test
make build
make test-coverage
make typecheck
make pre-commit
```

The pre-commit hook runs formatting and linting checks plus `tsc --noEmit` before a commit is created. Tests stay in the regular CI workflow instead of the commit hook.

## Project Notes

- The library source lives in `src/`.
- Tests live in `test/`.
- Example documentation lives in `docs/examples/`.

## Pull Requests

- Keep changes focused and reviewable.
- Add or update tests for behavior changes.
- Update docs or examples for user-facing changes.
- Call out public API changes, semver impact, and breaking changes in the PR description.

Maintainers may use coding agents to help draft changes or documentation. All contributions are still expected to meet the same review, testing, and documentation standards.
