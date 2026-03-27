export type { StateDiagramOptions } from "./diagram.js";
export { generateStateDiagram } from "./diagram.js";
export {
  FiniteStateMachineError,
  InvalidSourceStateError,
  TransitionConditionFailedError,
  TransitionExecutionError,
} from "./errors.js";
export { StateMachine } from "./state-machine.js";
export type {
  Condition,
  TransitionConfig,
  TransitionDefinition,
} from "./transition.js";
export { transition } from "./transition.js";
