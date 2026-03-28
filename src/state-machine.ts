interface StateMachineClass<S extends string> {
  initialState?: S;
  name?: string;
}

export class StateMachine<S extends string> {
  static initialState?: string;
  state: S;

  constructor(state?: S) {
    this.state = state ?? resolveInitialState(this);
  }
}

function resolveInitialState<S extends string>(machine: StateMachine<S>): S {
  const machineClass = machine.constructor as StateMachineClass<S>;

  if (machineClass.initialState !== undefined) {
    return machineClass.initialState;
  }

  throw new TypeError(
    `State machine ${machineClass.name || "AnonymousStateMachine"} requires an explicit state or a static initialState.`,
  );
}
