import { StateMachine, type SyncCondition, transition } from "../src/index";

type TypecheckState = "idle" | "done";
type Assert<T extends true> = T;
type IsExact<TActual, TExpected> = [TActual] extends [TExpected]
  ? [TExpected] extends [TActual]
    ? true
    : false
  : false;

const isAllowed: SyncCondition<SyncGuardMachine> = () => true;

class SyncGuardMachine extends StateMachine<TypecheckState> {
  constructor(initialState: TypecheckState = "idle") {
    super(initialState);
  }

  @transition<TypecheckState, SyncGuardMachine>({
    source: "idle",
    target: "done",
    conditions: [isAllowed],
  })
  finish() {}
}

class AsyncGuardPromiseMachine extends StateMachine<TypecheckState> {
  constructor(initialState: TypecheckState = "idle") {
    super(initialState);
  }

  @transition<TypecheckState, AsyncGuardPromiseMachine>({
    source: "idle",
    target: "done",
    conditions: [async () => true],
  })
  async finish() {}
}

class InvalidAsyncGuardMachine extends StateMachine<TypecheckState> {
  constructor(initialState: TypecheckState = "idle") {
    super(initialState);
  }

  // @ts-expect-error Async conditions require a promise-returning method.
  @transition<TypecheckState, InvalidAsyncGuardMachine>({
    source: "idle",
    target: "done",
    conditions: [async () => true],
  })
  finish() {}
}

type _syncResult = Assert<
  IsExact<ReturnType<SyncGuardMachine["finish"]>, void>
>;
type _asyncResult = Assert<
  IsExact<ReturnType<AsyncGuardPromiseMachine["finish"]>, Promise<void>>
>;
