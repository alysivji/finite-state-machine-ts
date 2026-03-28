import {
  ConcurrentTransitionError,
  InvalidSourceStateError,
  TransitionConditionFailedError,
  TransitionExecutionError,
} from "./errors.js";
import type { StateMachine } from "./state-machine.js";

export type Condition<TMachine> = (
  machine: TMachine,
) => boolean | Promise<boolean>;

export interface TransitionDefinition<S extends string> {
  method: string;
  source: readonly S[];
  target: S;
  onError?: S;
}

export interface TransitionConfig<
  S extends string,
  TMachine extends StateMachine<S> = StateMachine<S>,
> {
  source: S | readonly S[];
  target: S;
  conditions?: readonly Condition<TMachine>[];
  onError?: S;
}

type TransitionMethod<TMachine, TArgs extends unknown[], TResult> = (
  this: TMachine,
  ...args: TArgs
) => TResult;

const TRANSITION_DEFINITIONS = Symbol.for(
  "finite-state-machine-ts.transition-definitions",
);
const IN_FLIGHT_TRANSITION = Symbol.for(
  "finite-state-machine-ts.in-flight-transition",
);

interface InFlightTransition<S extends string> {
  method: string;
  sourceState: S;
}

export function transition<
  S extends string,
  TMachine extends StateMachine<S>,
  TArgs extends unknown[] = [],
  TResult = void,
>(config: TransitionConfig<S, TMachine>) {
  const sources = Array.isArray(config.source)
    ? [...config.source]
    : [config.source];
  const errorState = config.onError;

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<
      TransitionMethod<TMachine, TArgs, TResult>
    >,
  ): TypedPropertyDescriptor<TransitionMethod<TMachine, TArgs, TResult>> => {
    const originalMethod = descriptor.value;

    if (originalMethod === undefined) {
      throw new TypeError("@transition can only be applied to methods.");
    }

    defineTransition(target, {
      method: String(propertyKey),
      source: sources,
      target: config.target,
      onError: errorState,
    });

    descriptor.value = function wrappedTransition(
      this: TMachine,
      ...args: TArgs
    ): TResult {
      const methodName = String(propertyKey);
      const targetState = config.target;

      if (!sources.includes(this.state)) {
        throw new InvalidSourceStateError(methodName, this.state, sources);
      }

      const sourceState = this.state;
      const inFlightTransition = getInFlightTransition(this);

      if (inFlightTransition !== undefined) {
        throw new ConcurrentTransitionError(
          inFlightTransition.method,
          methodName,
          this.state,
        );
      }

      const conditions = config.conditions ?? [];
      let passedConditions: boolean | Promise<boolean>;

      try {
        passedConditions = evaluateConditions(this, conditions);
      } catch (error) {
        throw createTransitionExecutionError(
          this,
          methodName,
          sourceState,
          targetState,
          errorState,
          error,
        );
      }

      if (isPromiseLike(passedConditions)) {
        return runAsyncTransition({
          machine: this,
          methodName,
          sourceState,
          targetState,
          errorState,
          conditions: passedConditions,
          executeBody: () => originalMethod.apply(this, args),
        }) as TResult;
      }

      if (!passedConditions) {
        throw new TransitionConditionFailedError(methodName);
      }

      try {
        const result = originalMethod.apply(this, args);

        if (isPromiseLike(result)) {
          return runAsyncTransition({
            machine: this,
            methodName,
            sourceState,
            targetState,
            errorState,
            bodyResult: result,
          }) as TResult;
        }

        this.state = targetState;
        return result;
      } catch (error) {
        throw createTransitionExecutionError(
          this,
          methodName,
          sourceState,
          targetState,
          errorState,
          error,
        );
      }
    };

    return descriptor;
  };
}

export function getTransitionDefinitions<S extends string>(
  machineClass: new (...args: never[]) => StateMachine<S>,
): TransitionDefinition<S>[] {
  const definitions: TransitionDefinition<S>[] = [];
  let prototype = machineClass.prototype;

  while (prototype !== null && prototype !== Object.prototype) {
    const ownDefinitions = Object.hasOwn(prototype, TRANSITION_DEFINITIONS)
      ? ((prototype[TRANSITION_DEFINITIONS] as TransitionDefinition<S>[]) ?? [])
      : [];

    definitions.unshift(...ownDefinitions);
    prototype = Object.getPrototypeOf(prototype);
  }

  return definitions;
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

function evaluateConditions<TMachine>(
  machine: TMachine,
  conditions: readonly Condition<TMachine>[],
): boolean | Promise<boolean> {
  for (const [index, condition] of conditions.entries()) {
    const result = condition(machine);

    if (isPromiseLike(result)) {
      return evaluateConditionsAsync(machine, conditions, index, result);
    }

    if (!result) {
      return false;
    }
  }

  return true;
}

async function evaluateConditionsAsync<TMachine>(
  machine: TMachine,
  conditions: readonly Condition<TMachine>[],
  startIndex: number,
  initialResult: Promise<boolean>,
): Promise<boolean> {
  if (!(await initialResult)) {
    return false;
  }

  for (let index = startIndex + 1; index < conditions.length; index += 1) {
    const result = conditions[index](machine);

    if (isPromiseLike(result)) {
      if (!(await result)) {
        return false;
      }

      continue;
    }

    if (!result) {
      return false;
    }
  }

  return true;
}

function runAsyncTransition<
  S extends string,
  TMachine extends StateMachine<S>,
  TResult,
>({
  machine,
  methodName,
  sourceState,
  targetState,
  errorState,
  conditions,
  executeBody,
  bodyResult,
}: {
  machine: TMachine;
  methodName: string;
  sourceState: S;
  targetState: S;
  errorState?: S;
  conditions?: Promise<boolean>;
  executeBody?: () => TResult;
  bodyResult?: Promise<TResult>;
}): Promise<TResult> {
  setInFlightTransition(machine, {
    method: methodName,
    sourceState,
  });

  return (async () => {
    try {
      if (conditions !== undefined) {
        let passedConditions: boolean;

        try {
          passedConditions = await conditions;
        } catch (error) {
          throw createTransitionExecutionError(
            machine,
            methodName,
            sourceState,
            targetState,
            errorState,
            error,
          );
        }

        if (!passedConditions) {
          throw new TransitionConditionFailedError(methodName);
        }
      }

      try {
        const result =
          bodyResult ??
          executeBody?.() ??
          (() => {
            throw new TypeError("Async transition requires a transition body.");
          })();

        if (isPromiseLike(result)) {
          const value = await result;
          machine.state = targetState;
          return value;
        }

        machine.state = targetState;
        return result;
      } catch (error) {
        throw createTransitionExecutionError(
          machine,
          methodName,
          sourceState,
          targetState,
          errorState,
          error,
        );
      }
    } catch (error) {
      if (
        error instanceof TransitionConditionFailedError ||
        error instanceof TransitionExecutionError
      ) {
        throw error;
      }

      throw createTransitionExecutionError(
        machine,
        methodName,
        sourceState,
        targetState,
        errorState,
        error,
      );
    } finally {
      clearInFlightTransition(machine);
    }
  })();
}

function getInFlightTransition<S extends string>(
  machine: StateMachine<S>,
): InFlightTransition<S> | undefined {
  return (
    machine as unknown as Record<symbol, InFlightTransition<S> | undefined>
  )[IN_FLIGHT_TRANSITION];
}

function setInFlightTransition<S extends string>(
  machine: StateMachine<S>,
  transition: InFlightTransition<S>,
): void {
  (machine as unknown as Record<symbol, InFlightTransition<S>>)[
    IN_FLIGHT_TRANSITION
  ] = transition;
}

function clearInFlightTransition<S extends string>(
  machine: StateMachine<S>,
): void {
  delete (
    machine as unknown as Record<symbol, InFlightTransition<S> | undefined>
  )[IN_FLIGHT_TRANSITION];
}

function createTransitionExecutionError<S extends string>(
  machine: StateMachine<S>,
  methodName: string,
  sourceState: S,
  targetState: S,
  errorState: S | undefined,
  error: unknown,
): TransitionExecutionError<S> {
  if (errorState !== undefined) {
    machine.state = errorState;
  }

  return new TransitionExecutionError(methodName, sourceState, targetState, {
    cause: error,
  });
}

function defineTransition<S extends string>(
  target: object,
  definition: TransitionDefinition<S>,
): void {
  const metadataTarget = target as Record<symbol, TransitionDefinition<S>[]>;
  const existingDefinitions = Object.hasOwn(
    metadataTarget,
    TRANSITION_DEFINITIONS,
  )
    ? (metadataTarget[TRANSITION_DEFINITIONS] ?? [])
    : [];

  metadataTarget[TRANSITION_DEFINITIONS] = [...existingDefinitions, definition];
}
