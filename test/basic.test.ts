import { describe, expect, it } from "vitest";
import { StateMachine, transition, type Condition } from "../src/index";

type LightState = "off" | "on" | "broken";

const isPowered: Condition<LightSwitch> = (machine) => machine.hasPower;

class LightSwitch extends StateMachine<LightState> {
  hasPower = true;

  constructor(initialState: LightState = "off") {
    super(initialState);
  }

  @transition<LightState, LightSwitch, [], void>({
    source: "off",
    target: "on",
    conditions: [isPowered],
  })
  switchOn() {}

  @transition<LightState, LightSwitch, [], void>({
    source: "on",
    target: "off",
  })
  switchOff() {}

  @transition<LightState, LightSwitch, [], void>({
    source: ["off", "on"],
    target: "on",
    on_error: "broken",
  })
  overload() {
    throw new Error("bulb exploded");
  }
}

describe("transition", () => {
  it("moves to the target state after a valid transition", () => {
    const machine = new LightSwitch("off");

    machine.switchOn();

    expect(machine.state).toBe("on");
  });

  it("throws when the current state is not in source", () => {
    const machine = new LightSwitch("off");

    expect(() => machine.switchOff()).toThrow(
      'Cannot transition using switchOff from state "off".',
    );
    expect(machine.state).toBe("off");
  });

  it("throws when a condition fails and leaves state unchanged", () => {
    const machine = new LightSwitch("off");
    machine.hasPower = false;

    expect(() => machine.switchOn()).toThrow(
      "Conditions not met for transition switchOn.",
    );
    expect(machine.state).toBe("off");
  });

  it("sets the onError state when the transition method throws", () => {
    const machine = new LightSwitch("off");

    expect(() => machine.overload()).toThrow("bulb exploded");
    expect(machine.state).toBe("broken");
  });
});
