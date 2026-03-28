import { describe, expect, it } from "vitest";
import * as indexModule from "../src/index";
import {
  FiniteStateMachineError,
  generateStateDiagram,
  StateMachine,
  transition,
} from "../src/index";

class BarrelMachine extends StateMachine<"idle" | "done"> {
  constructor(initialState: "idle" | "done" = "idle") {
    super(initialState);
  }

  @transition<"idle" | "done", BarrelMachine>({
    source: "idle",
    target: "done",
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
    expect(
      generateStateDiagram(BarrelMachine, { initialState: "idle" }),
    ).toContain("stateDiagram-v2");
  });
});
