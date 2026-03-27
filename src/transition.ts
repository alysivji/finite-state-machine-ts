import {
  InvalidSourceStateError,
  TransitionConditionFailedError,
  TransitionExecutionError,
} from "./errors.js";
import { StateMachine } from "./state-machine.js";

export type Condition<TMachine> = (machine: TMachine) => boolean;

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
  on_error?: S;
}

type TransitionMethod<TMachine, TArgs extends unknown[], TResult> = (
  this: TMachine,
  ...args: TArgs
) => TResult;

const TRANSITION_DEFINITIONS = Symbol.for(
  "finite-state-machine-ts.transition-definitions",
);

export function transition<
  S extends string,
  TMachine extends StateMachine<S>,
  TArgs extends unknown[] = [],
  TResult = void,
>(config: TransitionConfig<S, TMachine>) {
  const sources = Array.isArray(config.source)
    ? [...config.source]
    : [config.source];
  const errorState = config.on_error ?? config.onError;

  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<
      TransitionMethod<TMachine, TArgs, TResult>
    >,
  ): TypedPropertyDescriptor<TransitionMethod<TMachine, TArgs, TResult>> {
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

      if (!sources.includes(this.state)) {
        throw new InvalidSourceStateError(methodName, this.state, sources);
      }

      const conditions = config.conditions ?? [];
      const passedConditions = conditions.every((condition) => condition(this));

      if (!passedConditions) {
        throw new TransitionConditionFailedError(methodName);
      }

      const sourceState = this.state;

      try {
        const result = originalMethod.apply(this, args);

        if (isPromiseLike(result)) {
          return result.then(
            (value) => {
              this.state = config.target;
              return value;
            },
            (error) => {
              if (errorState !== undefined) {
                this.state = errorState;
              }

              throw new TransitionExecutionError(
                methodName,
                sourceState,
                config.target,
                { cause: error },
              );
            },
          ) as TResult;
        }

        this.state = config.target;
        return result;
      } catch (error) {
        if (errorState !== undefined) {
          this.state = errorState;
        }

        throw new TransitionExecutionError(
          methodName,
          sourceState,
          config.target,
          { cause: error },
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
    const ownDefinitions = Object.prototype.hasOwnProperty.call(
      prototype,
      TRANSITION_DEFINITIONS,
    )
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

function defineTransition<S extends string>(
  target: object,
  definition: TransitionDefinition<S>,
): void {
  const metadataTarget = target as Record<symbol, TransitionDefinition<S>[]>;
  const existingDefinitions = Object.prototype.hasOwnProperty.call(
    metadataTarget,
    TRANSITION_DEFINITIONS,
  )
    ? (metadataTarget[TRANSITION_DEFINITIONS] ?? [])
    : [];

  metadataTarget[TRANSITION_DEFINITIONS] = [...existingDefinitions, definition];
}
