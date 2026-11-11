# AGENTS.md

Guidance for coding agents and contributors working inside the `finite-state-machine-ts` repository.

## Project intent

`finite-state-machine-ts` is a small, readable finite state machine library for TypeScript. The core idea is that machine behavior lives on normal class methods decorated with `@transition(...)`, rather than in a separate central configuration object.

Keep changes aligned with that goal:

- Prefer method-centric APIs over config-heavy abstractions.
- Preserve readability for small application-level state machines.
- Keep runtime behavior explicit and easy to trace from code to state diagram.

## Source of truth

When docs and code disagree, use this order:

1. `src/`
2. `test/`
3. `README.md` and `docs/examples/`

The examples are documentation-backed and test-backed, but the implementation and tests are authoritative.

## Stable public surface

The current supported package surface is:

- `StateMachine`
- `transition`
- `generateStateDiagram`
- exported error classes from `src/errors.ts`
- exported transition-related types from `src/index.ts`
- CLI: `fsm-draw-state-diagram`

Avoid introducing new public exports, changing CLI syntax, or altering runtime semantics unless the task explicitly calls for it.

## Implementation facts to preserve

- Transition metadata is collected by the decorator and stored in standard decorator metadata (`Class[Symbol.metadata]`), which subclasses inherit. The library installs a `Symbol.metadata` fallback because Node does not ship it yet.
- `generateStateDiagram(...)` derives Mermaid output from collected transition definitions, not from a separate machine config object.
- Async conditions and async transition bodies keep the machine in the source state until completion.
- Overlapping async transitions are blocked per machine instance with `ConcurrentTransitionError`.
- Examples in `docs/examples/` are backed by tests in `test/examples/`.

## Repo norms

- Behavior changes require tests.
- User-facing API or behavior changes should update the README and, when useful, the example docs.
- Public API changes should be called out clearly for semver review.
- Keep Markdown lightly formatted. Prefer short sections, plain bullets when needed, and unwrapped prose paragraphs over editor-oriented hard line breaks.
- Keep the package small and straightforward. Avoid adding repo-local tooling or abstractions unless they solve a concrete recurring problem.

## Releasing

Releases are manual and run through GitHub Actions:

1. Run the "Prepare Version Bump" workflow with `patch`, `minor`, or `major`. It only opens a PR that bumps `package.json`. While the package is 0.x, breaking changes go in a minor bump.
2. Merge that PR.
3. Run the "Release" workflow on `main`. It builds, typechecks, and tests, then tags `vX.Y.Z`, publishes to npm, and creates a GitHub release with generated notes.
4. Edit the GitHub release notes to call out breaking changes and migration steps.

npm publishing uses trusted publishing (GitHub OIDC with provenance), so there is no npm token secret. Don't add one. Long-lived publish tokens lose direct publish access in npm around January 2027. A new version can take a few minutes to show up on npmjs.com after the workflow finishes.

## Install scripts

npm 12 blocks dependency install scripts unless `allowScripts` in `package.json` lists them. The current entries (`esbuild`, `fsevents`) are denied because the build, tests, and docs build work without them. If a new dependency reports a blocked script, check whether anything breaks before approving it.
