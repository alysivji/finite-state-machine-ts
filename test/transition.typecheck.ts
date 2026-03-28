import {
  type Condition,
  StateMachine,
  type SyncCondition,
  type TransitionConfig,
  transition,
} from "../src/index";

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

const syncConfig: TransitionConfig<TypecheckState, SyncGuardMachine> = {
  source: "idle",
  target: "done",
  conditions: [isAllowed],
};

class StoredSyncConfigMachine extends StateMachine<TypecheckState> {
  constructor(initialState: TypecheckState = "idle") {
    super(initialState);
  }

  @transition(syncConfig)
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

const asyncConfig: TransitionConfig<
  TypecheckState,
  StoredAsyncConfigMachine,
  Condition<StoredAsyncConfigMachine>
> = {
  source: "idle",
  target: "done",
  conditions: [async () => true],
};

class StoredAsyncConfigMachine extends StateMachine<TypecheckState> {
  constructor(initialState: TypecheckState = "idle") {
    super(initialState);
  }

  @transition(asyncConfig)
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
type _storedSyncConfigResult = Assert<
  IsExact<ReturnType<StoredSyncConfigMachine["finish"]>, void>
>;
type _asyncResult = Assert<
  IsExact<ReturnType<AsyncGuardPromiseMachine["finish"]>, Promise<void>>
>;
type _storedAsyncConfigResult = Assert<
  IsExact<ReturnType<StoredAsyncConfigMachine["finish"]>, Promise<void>>
>;
