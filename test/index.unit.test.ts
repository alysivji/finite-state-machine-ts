import { describe, expect, it } from "vitest";
import * as indexModule from "../src/index";
import {
  FiniteStateMachineError,
  generateStateDiagram,
  StateMachine,
  transition,
} from "../src/index";

enum EnumJobState {
  Pending = "pending",
  Completed = "completed",
}

class BarrelMachine extends StateMachine<"idle" | "done"> {
  static initialState = "idle" as const;

  @transition<"idle" | "done", BarrelMachine>({
    source: "idle",
    target: "done",
  })
  finish() {}
}

class EnumMachine extends StateMachine<EnumJobState> {
  static initialState = EnumJobState.Pending;

  @transition<EnumJobState, EnumMachine>({
    source: EnumJobState.Pending,
    target: EnumJobState.Completed,
  })
  finish() {}
}

describe("index barrel exports", () => {
  it("re-exports the public runtime API", () => {
    expect(indexModule.StateMachine).toBe(StateMachine);
    expect(indexModule.transition).toBe(transition);
    expect(indexModule.generateStateDiagram).toBe(generateStateDiagram);
    expect(indexModule.FiniteStateMachineError).toBe(FiniteStateMachineError);
  });

  it("supports using the runtime exports together", () => {
    const machine = new indexModule.StateMachine<"idle" | "done">("idle");

    expect(machine.state).toBe("idle");
    expect(new BarrelMachine().state).toBe("idle");
    expect(new BarrelMachine("done").state).toBe("done");
    expect(
      generateStateDiagram(BarrelMachine, { initialState: "idle" }),
    ).toContain("stateDiagram-v2");
  });

  it("requires subclasses to declare an initial state when no explicit state is passed", () => {
    class MissingInitialStateMachine extends StateMachine<"idle" | "done"> {}

    expect(() => new MissingInitialStateMachine()).toThrow(
      "State machine MissingInitialStateMachine requires an explicit state or a static initialState.",
    );
  });

  it("supports string enum state types", () => {
    const machine = new EnumMachine();

    expect(machine.state).toBe(EnumJobState.Pending);

    machine.finish();

    expect(machine.state).toBe(EnumJobState.Completed);
    expect(new EnumMachine(EnumJobState.Completed).state).toBe(
      EnumJobState.Completed,
    );
  });
});
