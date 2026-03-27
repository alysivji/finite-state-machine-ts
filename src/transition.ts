import { StateMachine } from "./state-machine.js";

export type Condition<TMachine> = (machine: TMachine) => boolean;

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

export function transition<
  S extends string,
  TMachine extends StateMachine<S>,
  TArgs extends unknown[],
  TResult,
>(config: TransitionConfig<S, TMachine>) {
  const sources = Array.isArray(config.source)
    ? [...config.source]
    : [config.source];
  const errorState = config.on_error ?? config.onError;

  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<
      TransitionMethod<TMachine, TArgs, TResult>
    >,
  ): TypedPropertyDescriptor<TransitionMethod<TMachine, TArgs, TResult>> {
    const originalMethod = descriptor.value;

    if (originalMethod === undefined) {
      throw new TypeError("@transition can only be applied to methods.");
    }

    descriptor.value = function wrappedTransition(
      this: TMachine,
      ...args: TArgs
    ): TResult {
      if (!sources.includes(this.state)) {
        throw new Error(
          `Cannot transition using ${String(propertyKey)} from state "${this.state}".`,
        );
      }

      const conditions = config.conditions ?? [];
      const passedConditions = conditions.every((condition) => condition(this));

      if (!passedConditions) {
        throw new Error(
          `Conditions not met for transition ${String(propertyKey)}.`,
        );
      }

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

              throw error;
            },
          ) as TResult;
        }

        this.state = config.target;
        return result;
      } catch (error) {
        if (errorState !== undefined) {
          this.state = errorState;
        }

        throw error;
      }
    };

    return descriptor;
  };
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}
