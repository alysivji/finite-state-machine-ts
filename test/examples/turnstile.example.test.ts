import { describe, expect, it } from "vitest";
import {
  generateStateDiagram,
  InvalidSourceStateError,
  StateMachine,
  transition,
} from "../../src/index";

type TurnstileState = "closed" | "open";

class Turnstile extends StateMachine<TurnstileState> {
  static initialState = "closed" as const;

  @transition<TurnstileState, Turnstile>({
    source: ["closed", "open"],
    target: "open",
  })
  insertCoin() {}

  @transition<TurnstileState, Turnstile>({
    source: "open",
    target: "closed",
  })
  passThrough() {}
}

describe("turnstile example", () => {
  it("covers the documented transitions", () => {
    const machine = new Turnstile("closed");

    machine.insertCoin();
    machine.insertCoin();
    machine.passThrough();

    expect(machine.state).toBe("closed");
  });

  it("rejects passThrough from the closed state", () => {
    const machine = new Turnstile("closed");

    expect(() => machine.passThrough()).toThrow(InvalidSourceStateError);
  });

  it("matches the documented Mermaid diagram", () => {
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
