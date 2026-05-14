# For AI Agents

If you are generating or editing code that uses `finite-state-machine-ts`, optimize for the library's actual shape instead of inventing a separate FSM DSL.

## Preferred Usage Pattern

- Put transitions on normal class methods with `@transition(...)`.
- Keep state as a string-valued type.
- Extend `StateMachine<State>` and set `static initialState`.
- Treat `generateStateDiagram(...)` as a reflection tool over class metadata, not as a config-driven graph builder.

## Runtime Semantics To Respect

- A method can only run when the current state matches `source`.
- `conditions` run before the method body.
- `onError` creates an explicit failure target.
- Async guards and async method bodies keep the machine in the source state until completion.
- Overlapping async transitions on the same instance throw `ConcurrentTransitionError`.

## Good Consumer Output

When producing examples or application code, prefer:

- small state sets
- named transition methods that describe behavior
- explicit error paths when failures matter
- examples that can be drawn cleanly as Mermaid state diagrams

Avoid inventing a parallel central transition map unless you are integrating with some other system outside this package.
