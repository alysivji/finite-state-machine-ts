# finite-state-machine-ts

[![CI](https://github.com/alysivji/finite-state-machine-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/alysivji/finite-state-machine-ts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/alysivji/finite-state-machine-ts/graph/badge.svg)](https://codecov.io/gh/alysivji/finite-state-machine-ts)
[![npm version](https://img.shields.io/npm/v/finite-state-machine-ts)](https://www.npmjs.com/package/finite-state-machine-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: Biome](https://img.shields.io/badge/code%20style-biome-60a5fa)](https://biomejs.dev/)

`finite-state-machine-ts` is a lightweight, decorator-based finite state machine for TypeScript. Define transitions directly on class methods, keep state on the instance, and let runtime validation enforce allowed state changes.

The full documentation now lives in `docs/` for local development and Vercel deployment. Start with:

- [Getting Started](./docs/getting-started.md)
- [Transitions and Runtime Semantics](./docs/transitions-and-runtime.md)
- [State Diagrams](./docs/diagrams.md)
- [Examples](./docs/examples/index.md)
- [For AI Agents](./docs/for-ai-agents.md)

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

const BackgroundJobState = {
  Queued: "queued",
  Running: "running",
  Completed: "completed",
  Failed: "failed",
} as const;

type BackgroundJobState =
  (typeof BackgroundJobState)[keyof typeof BackgroundJobState];

class BackgroundJob extends StateMachine<BackgroundJobState> {
  static initialState: BackgroundJobState = BackgroundJobState.Queued;
  shouldFail = false;

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: BackgroundJobState.Queued,
    target: BackgroundJobState.Running,
  })
  start() {}

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: BackgroundJobState.Running,
    target: BackgroundJobState.Completed,
    onError: BackgroundJobState.Failed,
  })
  process() {
    if (this.shouldFail) {
      throw new Error("job failed");
    }
  }

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: BackgroundJobState.Failed,
    target: BackgroundJobState.Queued,
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

`new Machine()` starts from `static initialState`. Passing a state still restores a persisted machine from any valid state: `new BackgroundJob(BackgroundJobState.Failed)`.

## Highlights

- Transition definitions live on the methods that perform the work.
- Works with synchronous and asynchronous guards and transition bodies.
- Blocks overlapping async transitions per machine instance with `ConcurrentTransitionError`.
- Generates Mermaid state diagrams from the decorated class, including CLI support.

## API

### `StateMachine<S>`

A minimal base class that stores the current `state`.

```ts
declare class StateMachine<S extends string> {
  static initialState?: string;
  state: S;
  constructor(state?: S);
}
```

### `transition(config)`

Decorator for transition methods. Decorated methods can be synchronous or asynchronous, and conditions can return `boolean` or `Promise<boolean>`.

Use `SyncCondition<TMachine>` for extracted sync-only guards that should preserve a synchronous transition signature. The broader `Condition<TMachine>` type allows async guards and should be paired with a promise-returning transition method.

```ts
interface TransitionConfig<
  S extends string,
  TMachine extends StateMachine<S> = StateMachine<S>,
  TCondition extends Condition<TMachine> = SyncCondition<TMachine>,
> {
  source: S | readonly S[];
  target: S;
  conditions?: readonly TCondition[];
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

## AI and Tooling Notes

For AI coding assistants and other tools using the published package, see [llms.txt](./llms.txt).

For repository-specific contributor guidance, see [AGENTS.md](./AGENTS.md).

## Inspiration

- [django-fsm](https://github.com/viewflow/django-fsm)
- [finite-state-machine](https://github.com/alysivji/finite-state-machine)
