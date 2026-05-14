# State Diagrams

`generateStateDiagram(...)` derives Mermaid output from the transition metadata collected by the decorator. The diagram comes from the class definition itself, not from a second configuration object.

## Programmatic API

```ts
import { generateStateDiagram } from "finite-state-machine-ts";

const diagram = generateStateDiagram(BackgroundJob, {
  initialState: "queued",
});

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

## CLI

After building the package, use the bundled command:

```bash
fsm-draw-state-diagram --class ./dist/path/to/your-machine.js:YourStateMachine --initial-state off
```

Arguments:

- `--class`: required, in the format `<module-path>:<export-name>`
- `--initial-state`: optional, used for the Mermaid start node
- `--help`: prints the usage text

The CLI expects an ESM module path and exported class name. Relative paths are resolved from the current working directory.

## Output Expectations

Generated diagrams include:

- a node for each discovered state
- one edge per declared transition source
- an extra `(error)` edge when `onError` is configured
- an initial `[*]` edge when you pass `initialState`

That makes the diagram a direct reflection of the transition definitions already attached to the class.
