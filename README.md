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
import { StateMachine, transition, type Condition } from "finite-state-machine-ts";

const STATES = {
  off: "off",
  on: "on",
  broken: "broken",
} as const;

type LightState = (typeof STATES)[keyof typeof STATES];

class LightSwitch extends StateMachine<LightState> {
  hasPower = true;

  constructor(state: LightState = STATES.off) {
    super(state);
  }

  static readonly isPowered: Condition<LightSwitch> = (machine) => machine.hasPower;

  @transition<LightState, LightSwitch, [], void>({
    source: STATES.off,
    target: STATES.on,
    conditions: [LightSwitch.isPowered],
  })
  switchOn() {
    console.log("The light is on.");
  }

  @transition<LightState, LightSwitch, [], void>({
    source: STATES.on,
    target: STATES.off,
  })
  switchOff() {
    console.log("The light is off.");
  }

  @transition<LightState, LightSwitch, [], void>({
    source: [STATES.off, STATES.on],
    target: STATES.on,
    on_error: STATES.broken,
  })
  overload() {
    throw new Error("bulb exploded");
  }
}

const light = new LightSwitch();

light.switchOn();
console.log(light.state); // "on"

try {
  light.switchOn();
} catch (error) {
  console.error(error);
}

light.hasPower = false;
light.state = STATES.off;

try {
  light.switchOn();
} catch (error) {
  console.error(error);
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

## How It Works

The `@transition` decorator wraps a method and applies runtime checks in this order:

1. Confirm `this.state` matches the configured `source`.
2. Run every condition function, if provided.
3. Execute the original method.
4. If the method succeeds, set `this.state = target`.
5. If the method throws, optionally set `this.state = on_error` before rethrowing.

There is no central machine config or separate state graph. Transitions live where the behavior lives: on the methods that perform the work.

## Why Use This Instead of a Heavier FSM Library?

Use this library when you want a small runtime abstraction, not a full workflow engine. It keeps the API close to normal class methods and avoids the configuration overhead common in more feature-rich state machine libraries.

## State Diagrams

You can generate Mermaid state diagrams directly from the transitions declared on a state machine class.

### Programmatic API

```ts
import { generateStateDiagram } from "finite-state-machine-ts";

const diagram = generateStateDiagram(LightSwitch, { initialState: STATES.off });

console.log(diagram);
```

Example output:

```md
stateDiagram-v2
  state "off" as state_0
  state "on" as state_1
  state "broken" as state_2
  [*] --> state_0
  state_0 --> state_1: switchOn
  state_1 --> state_0: switchOff
  state_0 --> state_1: overload
  state_0 --> state_2: overload (error)
  state_1 --> state_1: overload
  state_1 --> state_2: overload (error)
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

Decorator for transition methods.

```ts
interface TransitionConfig<S extends string, TMachine extends StateMachine<S>> {
  source: S | readonly S[];
  target: S;
  conditions?: readonly Array<(machine: TMachine) => boolean>;
  onError?: S;
  on_error?: S;
}
```

### `generateStateDiagram(machineClass, options?)`

Returns Mermaid state diagram markdown for the transitions defined on the class.

## Inspiration

- [django-fsm](https://github.com/viewflow/django-fsm)
- [finite-state-machine](https://github.com/alysivji/finite-state-machine).
