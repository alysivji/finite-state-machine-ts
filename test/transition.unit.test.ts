import { describe, expect, it } from "vitest";
import {
  FiniteStateMachineError,
  generateStateDiagram,
  InvalidSourceStateError,
  StateMachine,
  TransitionConditionFailedError,
  TransitionExecutionError,
  transition,
} from "../src/index";
import { getTransitionDefinitions } from "../src/transition";

type SyncState = "idle" | "ready" | "done" | "failed";

class SyncMachine extends StateMachine<SyncState> {
  allow = true;
  events: string[] = [];

  constructor(initialState: SyncState = "idle") {
    super(initialState);
  }

  @transition<SyncState, SyncMachine, [], string>({
    source: "idle",
    target: "ready",
    conditions: [
      (machine) => {
        machine.events.push("condition");
        return machine.allow;
      },
    ],
  })
  prepare() {
    this.events.push("body");
    return "prepared";
  }

  @transition<SyncState, SyncMachine, [], number>({
    source: "ready",
    target: "done",
  })
  finish() {
    return 7;
  }

  @transition<SyncState, SyncMachine, [], void>({
    source: "ready",
    target: "done",
    onError: "failed",
  })
  explode() {
    throw new Error("boom");
  }
}

class SyncConditionThrowMachine extends StateMachine<SyncState> {
  constructor(initialState: SyncState = "idle") {
    super(initialState);
  }

  @transition<SyncState, SyncConditionThrowMachine>({
    source: "idle",
    target: "ready",
    onError: "failed",
    conditions: [
      () => {
        throw new Error("guard failed");
      },
    ],
  })
  start() {}
}

class NoOnErrorMachine extends StateMachine<"idle" | "done"> {
  constructor(initialState: "idle" | "done" = "idle") {
    super(initialState);
  }

  @transition<"idle" | "done", NoOnErrorMachine>({
    source: "idle",
    target: "done",
  })
  explode() {
    throw new Error("boom");
  }
}

class QuotedStateMachine extends StateMachine<'say "hi"' | "done"> {
  constructor(initialState: 'say "hi"' | "done" = 'say "hi"') {
    super(initialState);
  }

  @transition<'say "hi"' | "done", QuotedStateMachine>({
    source: 'say "hi"',
    target: "done",
  })
  finish() {}
}

describe("transition unit semantics", () => {
  it("rejects applying the transition decorator to a non-method descriptor", () => {
    const decorate = transition<"idle" | "done", StateMachine<"idle" | "done">>(
      {
        source: "idle",
        target: "done",
      },
    );

    expect(() =>
      decorate({}, "notAMethod", {} as TypedPropertyDescriptor<() => void>),
    ).toThrow("@transition can only be applied to methods.");
  });

  it("updates state immediately and preserves plain sync return values", () => {
    const machine = new SyncMachine("idle");

    const result = machine.prepare();

    expect(result).toBe("prepared");
    expect(machine.state).toBe("ready");
    expect(machine.events).toEqual(["condition", "body"]);
  });

  it("throws InvalidSourceStateError for an invalid source state", () => {
    const machine = new SyncMachine("idle");

    expect(() => machine.finish()).toThrow(FiniteStateMachineError);
    expect(() => machine.finish()).toThrow(InvalidSourceStateError);
    expect(() => machine.finish()).toThrow(
      'Cannot transition using finish from state "idle".',
    );
    expect(machine.state).toBe("idle");
  });

  it("throws TransitionConditionFailedError when a sync condition returns false", () => {
    const machine = new SyncMachine("idle");
    machine.allow = false;

    expect(() => machine.prepare()).toThrow(FiniteStateMachineError);
    expect(() => machine.prepare()).toThrow(TransitionConditionFailedError);
    expect(() => machine.prepare()).toThrow(
      "Conditions not met for transition prepare.",
    );
    expect(machine.state).toBe("idle");
    expect(machine.events).toEqual(["condition", "condition", "condition"]);
  });

  it("wraps sync condition throws in TransitionExecutionError and applies onError", () => {
    const machine = new SyncConditionThrowMachine("idle");
    let thrown: unknown;
    try {
      machine.start();
      throw new Error("expected start to throw");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TransitionExecutionError);
    expect((thrown as TransitionExecutionError<SyncState>).cause).toMatchObject(
      {
        message: "guard failed",
      },
    );
    expect(machine.state).toBe("failed");
  });

  it("wraps sync body throws in TransitionExecutionError and applies onError", () => {
    const machine = new SyncMachine("ready");

    try {
      machine.explode();
      throw new Error("expected explode to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TransitionExecutionError);
      expect((error as TransitionExecutionError<SyncState>).message).toBe(
        'Transition explode failed while moving from "ready" to "done".',
      );
      expect(
        ((error as TransitionExecutionError<SyncState>).cause as Error).message,
      ).toBe("boom");
    }

    expect(machine.state).toBe("failed");
  });

  it("keeps the source state when sync execution fails without onError", () => {
    const machine = new NoOnErrorMachine("idle");

    expect(() => machine.explode()).toThrow(TransitionExecutionError);
    expect(machine.state).toBe("idle");
  });

  it("keeps transition metadata and diagram generation unchanged", () => {
    expect(getTransitionDefinitions(SyncMachine)).toEqual([
      {
        method: "prepare",
        source: ["idle"],
        target: "ready",
      },
      {
        method: "finish",
        source: ["ready"],
        target: "done",
      },
      {
        method: "explode",
        source: ["ready"],
        target: "done",
        onError: "failed",
      },
    ]);

    expect(generateStateDiagram(SyncMachine, { initialState: "idle" })).toBe(
      `stateDiagram-v2
  state "idle" as state_0
  state "ready" as state_1
  state "done" as state_2
  state "failed" as state_3
  [*] --> state_0
  state_0 --> state_1: prepare
  state_1 --> state_2: finish
  state_1 --> state_2: explode
  state_1 --> state_3: explode (error)
`,
    );
  });

  it("builds diagrams without an explicit initial state and escapes quoted labels", () => {
    expect(generateStateDiagram(QuotedStateMachine)).toBe(`stateDiagram-v2
  state "say \\"hi\\"" as state_0
  state "done" as state_1
  state_0 --> state_1: finish
`);
  });

  it("treats explicitly undefined transition metadata as empty", () => {
    const transitionDefinitionsSymbol = Symbol.for(
      "finite-state-machine-ts.transition-definitions",
    );

    class MissingMetadataMachine extends StateMachine<"idle" | "done"> {
      constructor(initialState: "idle" | "done" = "idle") {
        super(initialState);
      }
    }

    Object.defineProperty(
      MissingMetadataMachine.prototype,
      transitionDefinitionsSymbol,
      {
        configurable: true,
        value: undefined,
        writable: true,
      },
    );

    expect(getTransitionDefinitions(MissingMetadataMachine)).toEqual([]);
  });

  it("appends transition metadata when an own metadata slot is present but undefined", () => {
    const transitionDefinitionsSymbol = Symbol.for(
      "finite-state-machine-ts.transition-definitions",
    );

    class UndefinedMetadataBase extends StateMachine<"idle" | "done"> {
      constructor(initialState: "idle" | "done" = "idle") {
        super(initialState);
      }
    }

    Object.defineProperty(
      UndefinedMetadataBase.prototype,
      transitionDefinitionsSymbol,
      {
        configurable: true,
        value: undefined,
        writable: true,
      },
    );

    class UndefinedMetadataMachine extends UndefinedMetadataBase {
      @transition<"idle" | "done", UndefinedMetadataMachine>({
        source: "idle",
        target: "done",
      })
      finish() {}
    }

    expect(getTransitionDefinitions(UndefinedMetadataMachine)).toEqual([
      {
        method: "finish",
        source: ["idle"],
        target: "done",
      },
    ]);
  });
});
