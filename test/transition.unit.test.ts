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
  static initialState: SyncState = "idle";
  allow = true;
  events: string[] = [];

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
  static initialState: SyncState = "idle";

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
  static initialState: "idle" | "done" = "idle";

  @transition<"idle" | "done", NoOnErrorMachine>({
    source: "idle",
    target: "done",
  })
  explode() {
    throw new Error("boom");
  }
}

class QuotedStateMachine extends StateMachine<'say "hi"' | "done"> {
  static initialState: 'say "hi"' | "done" = 'say "hi"';

  @transition<'say "hi"' | "done", QuotedStateMachine>({
    source: 'say "hi"',
    target: "done",
  })
  finish() {}
}

describe("transition unit semantics", () => {
  it("rejects applying the transition decorator to non-instance methods", () => {
    const decorate = transition<"idle" | "done", StateMachine<"idle" | "done">>(
      {
        source: "idle",
        target: "done",
      },
    );
    const context = (overrides: object) =>
      ({
        kind: "method",
        name: "notAllowed",
        static: false,
        private: false,
        metadata: {},
        ...overrides,
      }) as unknown as ClassMethodDecoratorContext<
        StateMachine<"idle" | "done">,
        () => void
      >;

    for (const overrides of [
      { kind: "getter" },
      { static: true },
      { private: true },
    ]) {
      expect(() => decorate(() => {}, context(overrides))).toThrow(
        "@transition can only be applied to public instance methods.",
      );
    }

    expect(() => decorate(() => {}, context({ metadata: undefined }))).toThrow(
      "@transition requires decorator metadata support (TypeScript 5.2+).",
    );
  });

  it("updates state immediately and preserves plain sync return values", () => {
    const machine = new SyncMachine("idle");

    const result = machine.prepare();

    expect(result).toBe("prepared");
    expect(machine.state).toBe("ready");
    expect(machine.events).toEqual(["condition", "body"]);
  });

  it("defaults to the machine's starting state but can be restored from any valid state", () => {
    expect(new SyncMachine().state).toBe("idle");
    expect(new SyncMachine("ready").state).toBe("ready");
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

  it("collects transition metadata across subclasses, base class first", () => {
    type InheritedState = "idle" | "running" | "done";

    class BaseMachine extends StateMachine<InheritedState> {
      static initialState: InheritedState = "idle";

      @transition<InheritedState, BaseMachine>({
        source: "idle",
        target: "running",
      })
      start() {}
    }

    class ChildMachine extends BaseMachine {
      @transition<InheritedState, ChildMachine>({
        source: "running",
        target: "done",
      })
      finish() {}
    }

    expect(getTransitionDefinitions(BaseMachine)).toEqual([
      { method: "start", source: ["idle"], target: "running" },
    ]);
    expect(getTransitionDefinitions(ChildMachine)).toEqual([
      { method: "start", source: ["idle"], target: "running" },
      { method: "finish", source: ["running"], target: "done" },
    ]);

    const machine = new ChildMachine();
    machine.start();
    machine.finish();
    expect(machine.state).toBe("done");
  });

  it("returns no definitions for a machine without transitions", () => {
    class EmptyMachine extends StateMachine<"idle"> {
      static initialState = "idle" as const;
    }

    expect(getTransitionDefinitions(EmptyMachine)).toEqual([]);
  });
});
