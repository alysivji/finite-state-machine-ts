import { describe, expect, it } from "vitest";
import {
  generateStateDiagram,
  InvalidSourceStateError,
  StateMachine,
  transition,
} from "../../src/index";

type TrafficLightState = "red" | "green" | "yellow";

class TrafficLight extends StateMachine<TrafficLightState> {
  static initialState = "red" as const;

  @transition<TrafficLightState, TrafficLight>({
    source: "red",
    target: "green",
  })
  goGreen() {}

  @transition<TrafficLightState, TrafficLight>({
    source: "green",
    target: "yellow",
  })
  goYellow() {}

  @transition<TrafficLightState, TrafficLight>({
    source: "yellow",
    target: "red",
  })
  goRed() {}
}

describe("traffic light example", () => {
  it("covers the documented cycle", () => {
    const machine = new TrafficLight("red");

    machine.goGreen();
    machine.goYellow();
    machine.goRed();

    expect(machine.state).toBe("red");
  });

  it("rejects skipping the documented cycle", () => {
    const machine = new TrafficLight("red");

    expect(() => machine.goRed()).toThrow(InvalidSourceStateError);
  });

  it("matches the documented Mermaid diagram", () => {
    expect(generateStateDiagram(TrafficLight, { initialState: "red" })).toBe(
      `stateDiagram-v2
  state "red" as state_0
  state "green" as state_1
  state "yellow" as state_2
  [*] --> state_0
  state_0 --> state_1: goGreen
  state_1 --> state_2: goYellow
  state_2 --> state_0: goRed
`,
    );
  });
});
