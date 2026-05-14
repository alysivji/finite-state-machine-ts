# Transitions and Runtime Semantics

The `@transition(...)` decorator wraps a method and enforces the transition at runtime. There is no separate machine config object to keep in sync.

## Transition Shape

Each transition config can define:

- `source`: one state or an array of allowed source states
- `target`: the state to commit on success
- `conditions`: sync or async guards evaluated before the method body
- `onError`: an optional error target used when a guard or method body throws

## Runtime Order

Each decorated call follows the same sequence:

1. Validate that `this.state` matches the configured `source`.
2. Reject overlapping transitions on the same instance when async work is already in flight.
3. Run conditions in declaration order.
4. Execute the original method body.
5. Commit `this.state = target` if everything succeeds.
6. If a condition or the body throws or rejects, optionally move to `onError` and throw `TransitionExecutionError` with the original error as `cause`.

## Sync and Async Behavior

Decorated methods stay synchronous when every guard and the method body are synchronous. If any guard is async, or the method body returns a promise, the decorated method returns a promise too.

While an async condition or async body is still pending, the machine stays in the source state. That means the state change only becomes visible after the full transition succeeds.

## Concurrency Semantics

Overlapping async transitions are blocked per machine instance with `ConcurrentTransitionError`. Other instances are unaffected.

```ts
import {
  ConcurrentTransitionError,
  StateMachine,
  transition,
} from "finite-state-machine-ts";

const DeploymentState = {
  Pending: "pending",
  Running: "running",
  Completed: "completed",
} as const;

type DeploymentState = (typeof DeploymentState)[keyof typeof DeploymentState];

class Deployment extends StateMachine<DeploymentState> {
  static initialState: DeploymentState = DeploymentState.Pending;

  @transition<DeploymentState, Deployment, [], Promise<string>>({
    source: DeploymentState.Pending,
    target: DeploymentState.Running,
    conditions: [
      async () => {
        await Promise.resolve();
        return true;
      },
    ],
  })
  async start() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return "started";
  }
}

const deployment = new Deployment();
const pending = deployment.start();

console.log(deployment.state); // "pending"

try {
  deployment.start();
} catch (error) {
  console.error(error instanceof ConcurrentTransitionError); // true
}

await pending;
console.log(deployment.state); // "running"
```

## Related Errors

The package exports these runtime error classes:

- `FiniteStateMachineError`
- `InvalidSourceStateError`
- `TransitionConditionFailedError`
- `TransitionExecutionError`
- `ConcurrentTransitionError`
