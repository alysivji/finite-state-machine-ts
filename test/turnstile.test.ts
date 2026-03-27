import { describe, expect, it } from "vitest";
import { generateStateDiagram, StateMachine, transition } from "../src/index";

type TurnstileState = "closed" | "open";

class Turnstile extends StateMachine<TurnstileState> {
  constructor(initialState: TurnstileState = "closed") {
    super(initialState);
  }

  @transition<TurnstileState, Turnstile, [], void>({
    source: ["closed", "open"],
    target: "open",
  })
  insertCoin() {}

  @transition<TurnstileState, Turnstile, [], void>({
    source: "open",
    target: "closed",
  })
  passThrough() {}
}

describe("turnstile transitions", () => {
  it("allows insertCoin from closed and open", () => {
    const machine = new Turnstile("closed");

    machine.insertCoin();
    expect(machine.state).toBe("open");

    machine.insertCoin();
    expect(machine.state).toBe("open");
  });

  it("allows passThrough from open", () => {
    const machine = new Turnstile("open");

    machine.passThrough();

    expect(machine.state).toBe("closed");
  });

  it("throws for passThrough from closed and keeps state unchanged", () => {
    const machine = new Turnstile("closed");

    expect(() => machine.passThrough()).toThrow(
      'Cannot transition using passThrough from state "closed".',
    );
    expect(machine.state).toBe("closed");
  });

  it("generates a Mermaid state diagram from transition metadata", () => {
    expect(generateStateDiagram(Turnstile, { initialState: "closed" })).toBe(
      `stateDiagram-v2
  state "closed" as state_0
  state "open" as state_1
  [*] --> state_0
  state_0 --> state_1: insertCoin
  state_1 --> state_1: insertCoin
  state_1 --> state_0: passThrough
`,
    );
  });
});
