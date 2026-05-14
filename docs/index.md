---
sidebar: false
---

<section class="landing-hero">
  <p class="landing-package-name">
    <span>finite-state-machine-</span>
    <span>ts</span>
  </p>
  <p class="landing-kicker">Decorator-based TypeScript FSM</p>
  <h2>Readable state machines that stay close to your code.</h2>
  <p class="landing-lede">
    Define transitions on normal class methods instead of pushing behavior into a separate config object.
  </p>
</section>

```ts
class PullRequest extends StateMachine<PullRequestState> {
  static initialState = PullRequestState.Draft;

  @transition({
    source: PullRequestState.Draft,
    target: PullRequestState.Open,
  })
  readyForReview() {}

  @transition({
    source: PullRequestState.Open,
    target: PullRequestState.Merged,
    conditions: [(machine) => machine.approvals >= 1],
  })
  merge() {}
}
```

<div class="landing-grid">
  <div class="landing-card">
    <h3>Method-centric by design</h3>
    <p>Transition rules live next to the behavior they guard, so small application state machines stay readable.</p>
  </div>
  <div class="landing-card">
    <h3>Explicit runtime semantics</h3>
    <p>Source-state validation, conditions, error targets, and async blocking happen at runtime in a predictable order.</p>
  </div>
  <div class="landing-card">
    <h3>Mermaid output included</h3>
    <p>Generate state diagrams directly from the decorated class with either the programmatic API or the CLI.</p>
  </div>
</div>

`finite-state-machine-ts` is a small finite state machine library for TypeScript. It is built for codebases that want state-aware methods, not a separate graph definition language.

The design center is straightforward:

- Keep transitions on normal class methods with `@transition(...)`.
- Keep machine state on the instance.
- Keep behavior easy to trace from source code to runtime and from runtime to Mermaid diagrams.

Use this library when you want enough structure to enforce state changes without moving your business logic into a large workflow framework.
