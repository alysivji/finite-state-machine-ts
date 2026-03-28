import { describe, expect, it } from "vitest";
import {
  generateStateDiagram,
  InvalidSourceStateError,
  StateMachine,
  type SyncCondition,
  TransitionConditionFailedError,
  transition,
} from "../../src/index";

type LightState = "off" | "on";

const isPowered: SyncCondition<LightSwitch> = (machine) => machine.hasPower;

class LightSwitch extends StateMachine<LightState> {
  static initialState: LightState = "off";
  hasPower = true;

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
