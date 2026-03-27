import { describe, expect, it } from "vitest";
import {
  FiniteStateMachineError,
  generateStateDiagram,
  InvalidSourceStateError,
  StateMachine,
  TransitionConditionFailedError,
  transition,
  type Condition,
} from "../src/index";

type LightState = "off" | "on";

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
}

describe("transition", () => {
  it("moves to the target state after a valid transition", () => {
    const machine = new LightSwitch("off");

    machine.switchOn();

    expect(machine.state).toBe("on");
  });

  it("throws when transitioning off -> off and keeps state unchanged", () => {
    const machine = new LightSwitch("off");

    expect(() => machine.switchOff()).toThrow(FiniteStateMachineError);
    expect(() => machine.switchOff()).toThrow(InvalidSourceStateError);
    expect(() => machine.switchOff()).toThrow(
      'Cannot transition using switchOff from state "off".',
    );
    expect(machine.state).toBe("off");
  });

  it("raises an error for off -> off", () => {
    const machine = new LightSwitch("off");

    expect(() => machine.switchOff()).toThrow(FiniteStateMachineError);
  });

  it("throws when a condition fails and leaves state unchanged", () => {
    const machine = new LightSwitch("off");
    machine.hasPower = false;

    expect(() => machine.switchOn()).toThrow(FiniteStateMachineError);
    expect(() => machine.switchOn()).toThrow(TransitionConditionFailedError);
    expect(() => machine.switchOn()).toThrow(
      "Conditions not met for transition switchOn.",
    );
    expect(machine.state).toBe("off");
  });

  it("throws when transitioning on -> on and keeps state unchanged", () => {
    const machine = new LightSwitch("off");

    machine.switchOn();
    expect(machine.state).toBe("on");

    expect(() => machine.switchOn()).toThrow(FiniteStateMachineError);
    expect(() => machine.switchOn()).toThrow(InvalidSourceStateError);
    expect(() => machine.switchOn()).toThrow(
      'Cannot transition using switchOn from state "on".',
    );
    expect(machine.state).toBe("on");
  });

  it("generates a Mermaid state diagram from transition metadata", () => {
    expect(generateStateDiagram(LightSwitch, { initialState: "off" })).toBe(
      `stateDiagram-v2
  state "off" as state_0
  state "on" as state_1
  [*] --> state_0
  state_0 --> state_1: switchOn
  state_1 --> state_0: switchOff
`,
    );
  });
});
