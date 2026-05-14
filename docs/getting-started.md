# Getting Started

## Install

```bash
npm install finite-state-machine-ts
```

Enable decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## First Machine

```ts
import { StateMachine, transition } from "finite-state-machine-ts";

const LightState = {
  Off: "off",
  On: "on",
} as const;

type LightState = (typeof LightState)[keyof typeof LightState];

class LightSwitch extends StateMachine<LightState> {
  static initialState: LightState = LightState.Off;

  @transition<LightState, LightSwitch, [], void>({
    source: LightState.Off,
    target: LightState.On,
  })
  switchOn() {}

  @transition<LightState, LightSwitch, [], void>({
    source: LightState.On,
    target: LightState.Off,
  })
  switchOff() {}
}

const light = new LightSwitch();
light.switchOn();
console.log(light.state); // "on"
```

`new LightSwitch()` starts from `static initialState`. The base class also accepts an explicit current state when you need to restore a machine from persisted data:

```ts
const restored = new LightSwitch(LightState.On);
console.log(restored.state); // "on"
```

## Defining States

This library works with string-valued states. The examples in this repo prefer an `as const` object because it keeps named values close to plain TypeScript:

```ts
const JobState = {
  Queued: "queued",
  Running: "running",
  Completed: "completed",
  Failed: "failed",
} as const;

type JobState = (typeof JobState)[keyof typeof JobState];
```

String unions and string enums also work. The important part is that your machine state type is a string union at runtime.
