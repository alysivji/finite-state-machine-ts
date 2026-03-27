export { generateStateDiagram } from "./diagram.js";
export {
  FiniteStateMachineError,
  InvalidSourceStateError,
  TransitionConditionFailedError,
  TransitionExecutionError,
} from "./errors.js";
export { StateMachine } from "./state-machine.js";
export { transition } from "./transition.js";
export type { StateDiagramOptions } from "./diagram.js";
export type {
  Condition,
  TransitionConfig,
  TransitionDefinition,
} from "./transition.js";
