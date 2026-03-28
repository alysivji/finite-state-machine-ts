import { describe, expect, it } from "vitest";
import {
  ConcurrentTransitionError,
  InvalidSourceStateError,
  StateMachine,
  TransitionConditionFailedError,
  TransitionExecutionError,
  transition,
} from "../src/index";

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

type AsyncState = "idle" | "running" | "done" | "failed";

class AsyncConditionMachine extends StateMachine<AsyncState> {
  allow = true;
  events: string[] = [];
  gate = createDeferred<boolean>();

  constructor(initialState: AsyncState = "idle") {
    super(initialState);
  }

  @transition<AsyncState, AsyncConditionMachine, [], Promise<string>>({
    source: "idle",
    target: "running",
    onError: "failed",
    conditions: [
      (machine) => {
        machine.events.push("sync-condition");
        return true;
      },
      async (machine) => {
        machine.events.push("async-condition:start");
        const allowed = await machine.gate.promise;
        machine.events.push("async-condition:end");
        return allowed;
      },
      (machine) => {
        machine.events.push("late-condition");
        return machine.allow;
      },
    ],
  })
  async start() {
    this.events.push("body");
    return "started";
  }

  @transition<AsyncState, AsyncConditionMachine>({
    source: "idle",
    target: "done",
  })
  finish() {}

  @transition<AsyncState, AsyncConditionMachine>({
    source: "running",
    target: "done",
  })
  complete() {}
}

class AsyncBodyMachine extends StateMachine<AsyncState> {
  bodyGate = createDeferred<string>();

  constructor(initialState: AsyncState = "idle") {
    super(initialState);
  }

  @transition<AsyncState, AsyncBodyMachine, [], Promise<string>>({
    source: "idle",
    target: "done",
    onError: "failed",
  })
  async run() {
    return this.bodyGate.promise;
  }

  @transition<AsyncState, AsyncBodyMachine>({
    source: "idle",
    target: "running",
  })
  markRunning() {}
}

class AsyncTransitionConditionErrorMachine extends StateMachine<AsyncState> {
  constructor(initialState: AsyncState = "idle") {
    super(initialState);
  }

  @transition<AsyncState, AsyncTransitionConditionErrorMachine>({
    source: "idle",
    target: "running",
    onError: "failed",
    conditions: [
      () => Promise.reject(new TransitionConditionFailedError("inner")),
    ],
  })
  async start() {}
}

class AsyncTransitionBodyErrorMachine extends StateMachine<AsyncState> {
  constructor(initialState: AsyncState = "idle") {
    super(initialState);
  }

  @transition<AsyncState, AsyncTransitionBodyErrorMachine, [], Promise<void>>({
    source: "idle",
    target: "running",
    onError: "failed",
  })
  async start() {
    throw new TransitionConditionFailedError("inner");
  }
}

class AsyncGuardSyncVoidBodyMachine extends StateMachine<AsyncState> {
  gate = createDeferred<boolean>();
  events: string[] = [];

  constructor(initialState: AsyncState = "idle") {
    super(initialState);
  }

  @transition<AsyncState, AsyncGuardSyncVoidBodyMachine>({
    source: "idle",
    target: "running",
    conditions: [
      async (machine) => {
        machine.events.push("async-condition:start");
        const allowed = await machine.gate.promise;
        machine.events.push("async-condition:end");
        return allowed;
      },
    ],
  })
  async start() {
    this.events.push("body");
  }
}

class MultiAsyncConditionMachine extends StateMachine<AsyncState> {
  firstGate = createDeferred<boolean>();
  secondGate = createDeferred<boolean>();
  allowLateCondition = true;
  events: string[] = [];

  constructor(initialState: AsyncState = "idle") {
    super(initialState);
  }

  @transition<AsyncState, MultiAsyncConditionMachine>({
    source: "idle",
    target: "running",
    conditions: [
      async (machine) => {
        machine.events.push("first:start");
        const allowed = await machine.firstGate.promise;
        machine.events.push("first:end");
        return allowed;
      },
      async (machine) => {
        machine.events.push("second:start");
        const allowed = await machine.secondGate.promise;
        machine.events.push("second:end");
        return allowed;
      },
      (machine) => {
        machine.events.push("late-sync");
        return machine.allowLateCondition;
      },
    ],
  })
  async start() {}
}

describe("async transition unit semantics", () => {
  it("returns a promise when any condition is async and keeps state unchanged until completion", async () => {
    const machine = new AsyncConditionMachine("idle");

    const result = machine.start();

    expect(result).toBeInstanceOf(Promise);
    expect(machine.state).toBe("idle");
    expect(machine.events).toEqual(["sync-condition", "async-condition:start"]);

    machine.gate.resolve(true);

    await expect(result).resolves.toBe("started");
    expect(machine.state).toBe("running");
    expect(machine.events).toEqual([
      "sync-condition",
      "async-condition:start",
      "async-condition:end",
      "late-condition",
      "body",
    ]);
  });

  it("short-circuits async condition evaluation after the first false result", async () => {
    const machine = new AsyncConditionMachine("idle");

    const result = machine.start();
    machine.gate.resolve(false);

    await expect(result).rejects.toThrow(TransitionConditionFailedError);
    expect(machine.state).toBe("idle");
    expect(machine.events).toEqual([
      "sync-condition",
      "async-condition:start",
      "async-condition:end",
    ]);
  });

  it("wraps rejected async conditions in TransitionExecutionError and applies onError", async () => {
    const machine = new AsyncConditionMachine("idle");

    const result = machine.start();
    machine.gate.reject(new Error("guard failed"));

    await expect(result).rejects.toThrow(TransitionExecutionError);
    await expect(result).rejects.toMatchObject({
      cause: expect.objectContaining({ message: "guard failed" }),
    });
    expect(machine.state).toBe("failed");
  });

  it("wraps async condition rejections that throw TransitionConditionFailedError", async () => {
    const machine = new AsyncTransitionConditionErrorMachine("idle");
    const result = machine.start();

    await expect(result).rejects.toThrow(TransitionExecutionError);
    await expect(result).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: "Conditions not met for transition inner.",
      }),
    });
    expect(machine.state).toBe("failed");
  });

  it("returns a promise for async bodies and commits state only after resolution", async () => {
    const machine = new AsyncBodyMachine("idle");

    const result = machine.run();

    expect(result).toBeInstanceOf(Promise);
    expect(machine.state).toBe("idle");

    machine.bodyGate.resolve("done");

    await expect(result).resolves.toBe("done");
    expect(machine.state).toBe("done");
  });

  it("accepts undefined from a sync body after async conditions resolve", async () => {
    const machine = new AsyncGuardSyncVoidBodyMachine("idle");

    const result = machine.start();

    expect(result).toBeInstanceOf(Promise);
    expect(machine.state).toBe("idle");

    machine.gate.resolve(true);

    await expect(result).resolves.toBeUndefined();
    expect(machine.state).toBe("running");
    expect(machine.events).toEqual([
      "async-condition:start",
      "async-condition:end",
      "body",
    ]);
  });

  it("continues through later async conditions before failing on a final sync condition", async () => {
    const machine = new MultiAsyncConditionMachine("idle");

    const result = machine.start();
    machine.firstGate.resolve(true);
    await Promise.resolve();

    machine.allowLateCondition = false;
    machine.secondGate.resolve(true);

    await expect(result).rejects.toThrow(TransitionConditionFailedError);
    expect(machine.state).toBe("idle");
    expect(machine.events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
      "late-sync",
    ]);
  });

  it("stops when a later async condition resolves false", async () => {
    const machine = new MultiAsyncConditionMachine("idle");

    const result = machine.start();
    machine.firstGate.resolve(true);
    await Promise.resolve();

    machine.secondGate.resolve(false);

    await expect(result).rejects.toThrow(TransitionConditionFailedError);
    expect(machine.state).toBe("idle");
    expect(machine.events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("wraps rejected async bodies in TransitionExecutionError and preserves the cause", async () => {
    const machine = new AsyncBodyMachine("idle");

    const result = machine.run();
    machine.bodyGate.reject(new Error("body failed"));

    await expect(result).rejects.toThrow(TransitionExecutionError);
    await expect(result).rejects.toMatchObject({
      cause: expect.objectContaining({ message: "body failed" }),
    });
    expect(machine.state).toBe("failed");
  });

  it("wraps async body throws that use TransitionConditionFailedError", async () => {
    const machine = new AsyncTransitionBodyErrorMachine("idle");
    const result = machine.start();

    await expect(result).rejects.toThrow(TransitionExecutionError);
    await expect(result).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: "Conditions not met for transition inner.",
      }),
    });
    expect(machine.state).toBe("failed");
  });

  it("blocks overlapping transitions while an async condition is pending and clears the marker after success", async () => {
    const machine = new AsyncConditionMachine("idle");

    const pendingTransition = machine.start();

    expect(() => machine.finish()).toThrow(ConcurrentTransitionError);
    expect(() => machine.finish()).toThrow(
      "Transition finish cannot start while start is still in progress.",
    );

    machine.gate.resolve(true);
    await pendingTransition;

    const freshMachine = new AsyncConditionMachine("idle");
    const nextTransition = freshMachine.start();
    freshMachine.gate.resolve(true);
    await expect(nextTransition).resolves.toBe("started");
  });

  it("checks source state before overlap blocking when an async transition is pending", async () => {
    const machine = new AsyncConditionMachine("idle");
    const pendingTransition = machine.start();

    try {
      expect(() => machine.complete()).toThrow(InvalidSourceStateError);
      expect(() => machine.complete()).not.toThrow(ConcurrentTransitionError);
    } finally {
      machine.gate.resolve(true);
      await pendingTransition;
    }
  });

  it("blocks overlapping transitions while an async body is pending and clears the marker after failure", async () => {
    const machine = new AsyncBodyMachine("idle");
    const otherMachine = new AsyncBodyMachine("idle");

    const pendingTransition = machine.run();

    expect(() => machine.markRunning()).toThrow(ConcurrentTransitionError);

    const otherTransition = otherMachine.run();
    otherMachine.bodyGate.resolve("other");
    await expect(otherTransition).resolves.toBe("other");

    machine.bodyGate.reject(new Error("body failed"));
    await expect(pendingTransition).rejects.toThrow(TransitionExecutionError);

    const retryMachine = new AsyncBodyMachine("idle");
    const retryTransition = retryMachine.run();
    retryMachine.bodyGate.resolve("retry");
    await expect(retryTransition).resolves.toBe("retry");
  });
});
