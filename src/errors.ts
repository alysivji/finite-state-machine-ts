export class FiniteStateMachineError extends Error {
  override readonly name: string = "FiniteStateMachineError";
}

export class InvalidSourceStateError<
  S extends string,
> extends FiniteStateMachineError {
  override readonly name: string = "InvalidSourceStateError";

  constructor(
    public readonly method: string,
    public readonly currentState: S,
    public readonly allowedStates: readonly S[],
  ) {
    super(`Cannot transition using ${method} from state "${currentState}".`);
  }
}

export class TransitionConditionFailedError extends FiniteStateMachineError {
  override readonly name: string = "TransitionConditionFailedError";

  constructor(public readonly method: string) {
    super(`Conditions not met for transition ${method}.`);
  }
}

export class ConcurrentTransitionError<
  S extends string,
> extends FiniteStateMachineError {
  override readonly name: string = "ConcurrentTransitionError";

  constructor(
    public readonly activeMethod: string,
    public readonly attemptedMethod: string,
    public readonly currentState: S,
  ) {
    super(
      `Transition ${attemptedMethod} cannot start while ${activeMethod} is still in progress.`,
    );
  }
}

export class TransitionExecutionError<
  S extends string,
> extends FiniteStateMachineError {
  override readonly name: string = "TransitionExecutionError";
  declare readonly cause: unknown;

  constructor(
    public readonly method: string,
    public readonly sourceState: S,
    public readonly targetState: S,
    options?: { cause?: unknown },
  ) {
    super(
      `Transition ${method} failed while moving from "${sourceState}" to "${targetState}".`,
    );
    this.cause = options?.cause;
  }
}
