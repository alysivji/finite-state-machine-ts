import { describe, expect, it } from "vitest";
import {
  type Condition,
  generateStateDiagram,
  InvalidSourceStateError,
  StateMachine,
  TransitionConditionFailedError,
  transition,
} from "../../src/index";

type LightState = "off" | "on";

const isPowered: Condition<LightSwitch> = (machine) => machine.hasPower;

class LightSwitch extends StateMachine<LightState> {
  hasPower = true;

  constructor(initialState: LightState = "off") {
    super(initialState);
  }

  @transition<LightState, LightSwitch>({
    source: "off",
    target: "on",
    conditions: [isPowered],
  })
  switchOn() {}

  @transition<LightState, LightSwitch>({
    source: "on",
    target: "off",
  })
  switchOff() {}
}

describe("light switch example", () => {
  it("covers the documented happy path", () => {
    const machine = new LightSwitch("off");

    machine.switchOn();
    machine.switchOff();

    expect(machine.state).toBe("off");
  });

  it("covers the documented failure cases", () => {
    const powerless = new LightSwitch("off");
    powerless.hasPower = false;

    expect(() => powerless.switchOn()).toThrow(TransitionConditionFailedError);

    const alreadyOff = new LightSwitch("off");
    expect(() => alreadyOff.switchOff()).toThrow(InvalidSourceStateError);
  });

  it("matches the documented Mermaid diagram", () => {
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
