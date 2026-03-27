import type { StateMachine } from "./state-machine.js";
import {
  getTransitionDefinitions,
  type TransitionDefinition,
} from "./transition.js";

export interface StateDiagramOptions<S extends string> {
  initialState?: S;
}

export function generateStateDiagram<S extends string>(
  machineClass: new (...args: never[]) => StateMachine<S>,
  options: StateDiagramOptions<S> = {},
): string {
  const definitions = getTransitionDefinitions(machineClass);
  const states = collectStates(definitions, options.initialState);
  const aliases = new Map(
    states.map((state, index) => [state, `state_${index}`]),
  );
  const lines = ["stateDiagram-v2"];

  for (const state of states) {
    lines.push(`  state "${escapeLabel(state)}" as ${aliases.get(state)}`);
  }

  if (options.initialState !== undefined) {
    lines.push(`  [*] --> ${aliases.get(options.initialState)}`);
  }

  for (const definition of definitions) {
    for (const source of definition.source) {
      lines.push(
        `  ${aliases.get(source)} --> ${aliases.get(definition.target)}: ${definition.method}`,
      );

      if (definition.onError !== undefined) {
        lines.push(
          `  ${aliases.get(source)} --> ${aliases.get(definition.onError)}: ${definition.method} (error)`,
        );
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

function collectStates<S extends string>(
  definitions: TransitionDefinition<S>[],
  initialState?: S,
): S[] {
  const states = new Set<S>();

  if (initialState !== undefined) {
    states.add(initialState);
  }

  for (const definition of definitions) {
    for (const source of definition.source) {
      states.add(source);
    }

    states.add(definition.target);

    if (definition.onError !== undefined) {
      states.add(definition.onError);
    }
  }

  return [...states];
}

function escapeLabel(state: string): string {
  return state.replaceAll('"', '\\"');
}
