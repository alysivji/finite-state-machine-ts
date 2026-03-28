# finite-state-machine-ts

`finite-state-machine-ts` is a lightweight, decorator-based finite state machine for TypeScript. It ports the ergonomics of the original Python library to modern TypeScript: define transitions directly on class methods, keep state on the instance, and let runtime validation enforce allowed state changes.

## Installation

```bash
npm install finite-state-machine-ts
```

Make sure your `tsconfig.json` enables decorators:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Basic Usage

```ts
import { StateMachine, transition } from "finite-state-machine-ts";

type BackgroundJobState = "queued" | "running" | "completed" | "failed";

class BackgroundJob extends StateMachine<BackgroundJobState> {
  shouldFail = false;

  constructor(initialState: BackgroundJobState = "queued") {
    super(initialState);
  }

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: "queued",
    target: "running",
  })
  start() {}

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: "running",
    target: "completed",
    onError: "failed",
  })
  process() {
    if (this.shouldFail) {
      throw new Error("job failed");
    }
  }

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: "failed",
    target: "queued",
  })
  retry() {}
}

const job = new BackgroundJob();

job.start();
console.log(job.state); // "running"

job.process();
console.log(job.state); // "completed"

try {
  const failingJob = new BackgroundJob();
  failingJob.start();
  failingJob.shouldFail = true;
  failingJob.process();
} catch (error) {
  console.error(error); // TransitionExecutionError
  console.log((error as Error).cause); // Error: job failed
}
```

## Example Docs

The repo includes a small set of worked examples with Mermaid diagrams and annotated code:

- [Examples index](./docs/examples/README.md)
- [Turnstile](./docs/examples/turnstile.md)
- [Light Switch](./docs/examples/light-switch.md)
- [Traffic Light](./docs/examples/traffic-light.md)
- [Background Job](./docs/examples/background-job.md)
- [GitHub Pull Request](./docs/examples/github-pull-request.md)
- [Async Deployment](./docs/examples/async-deployment.md)

## How It Works

The `@transition` decorator wraps a method and applies runtime checks in this order:

1. Confirm `this.state` matches the configured `source`.
2. Reject overlapping transitions on the same instance while async work is still pending.
3. Run every condition function in declaration order.
4. Execute the original method.
5. If the method succeeds, set `this.state = target`.
6. If a condition or method throws or rejects, optionally set `this.state = onError` and throw a `TransitionExecutionError` with the original error attached as `cause`.

There is no central machine config or separate state graph. Transitions live where the behavior lives: on the methods that perform the work.

Decorated methods stay synchronous when every condition and the method body are synchronous. If any condition is async, or the body returns a promise, the decorated method returns a promise instead.

## Async Transitions

Conditions and transition bodies can both be synchronous or asynchronous.

```ts
import {
  ConcurrentTransitionError,
  StateMachine,
  transition,
} from "finite-state-machine-ts";

type DeploymentState = "pending" | "running" | "completed";

class Deployment extends StateMachine<DeploymentState> {
  constructor(initialState: DeploymentState = "pending") {
    super(initialState);
  }

  @transition<DeploymentState, Deployment, [], Promise<string>>({
    source: "pending",
    target: "running",
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

While an async condition or async body is pending, the machine stays in the source state and blocks other transitions on that same instance with `ConcurrentTransitionError`. Other machine instances are unaffected.

## Why Use This Instead of a Heavier FSM Library?

Use this library when you want a small runtime abstraction, not a full workflow engine. It keeps the API close to normal class methods and avoids the configuration overhead common in more feature-rich state machine libraries.

## State Diagrams

You can generate Mermaid state diagrams directly from the transitions declared on a state machine class.

### Programmatic API

```ts
import { generateStateDiagram } from "finite-state-machine-ts";

const diagram = generateStateDiagram(BackgroundJob, { initialState: "queued" });

console.log(diagram);
```

Example output:

```md
stateDiagram-v2
  state "queued" as state_0
  state "running" as state_1
  state "completed" as state_2
  state "failed" as state_3
  [*] --> state_0
  state_0 --> state_1: start
  state_1 --> state_2: process
  state_1 --> state_3: process (error)
  state_3 --> state_0: retry
```

### CLI

After building the package, use the bundled command:

```bash
fsm-draw-state-diagram --class ./dist/examples/light-switch.js:LightSwitch --initial-state off
```

The `--class` argument matches the Python library's shape: `<module-path>:<export-name>`.

## API

### `StateMachine<S>`

A minimal base class that stores the current `state`.

```ts
class StateMachine<S extends string> {
  constructor(public state: S) {}
}
```

### `transition(config)`

Decorator for transition methods. Decorated methods can be synchronous or asynchronous, and conditions can return `boolean` or `Promise<boolean>`.

```ts
interface TransitionConfig<
  S extends string,
  TMachine extends StateMachine<S> = StateMachine<S>,
> {
  source: S | readonly S[];
  target: S;
  conditions?: readonly Condition<TMachine>[];
  onError?: S;
}
```

### `generateStateDiagram(machineClass, options?)`

Returns Mermaid state diagram markdown for the transitions defined on the class.

### Errors

Transition failures use these exported error types:

- `InvalidSourceStateError` when the current state is not in `source`.
- `TransitionConditionFailedError` when any configured condition returns or resolves to `false`.
- `TransitionExecutionError` when a condition or the decorated method throws or rejects. The original error is available as `error.cause`.
- `ConcurrentTransitionError` when another async transition is already in progress on the same machine instance.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup and contribution guidelines.

## Inspiration

- [django-fsm](https://github.com/viewflow/django-fsm)
- [finite-state-machine](https://github.com/alysivji/finite-state-machine)
