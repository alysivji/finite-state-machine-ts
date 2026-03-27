import { describe, expect, it } from "vitest";
import { StateMachine, transition } from "../src/index";

type TrafficLightState = "red" | "green" | "yellow";

class TrafficLight extends StateMachine<TrafficLightState> {
  constructor(initialState: TrafficLightState = "red") {
    super(initialState);
  }

  @transition<TrafficLightState, TrafficLight, [], void>({
    source: "red",
    target: "green",
  })
  goGreen() {}

  @transition<TrafficLightState, TrafficLight, [], void>({
    source: "green",
    target: "yellow",
  })
  goYellow() {}

  @transition<TrafficLightState, TrafficLight, [], void>({
    source: "yellow",
    target: "red",
  })
  goRed() {}
}

describe("traffic light transitions", () => {
  it("cycles red -> green -> yellow -> red", () => {
    const machine = new TrafficLight("red");

    machine.goGreen();
    expect(machine.state).toBe("green");

    machine.goYellow();
    expect(machine.state).toBe("yellow");

    machine.goRed();
    expect(machine.state).toBe("red");
  });

  it("throws for red -> red and keeps state unchanged", () => {
    const machine = new TrafficLight("red");

    expect(() => machine.goRed()).toThrow(
      'Cannot transition using goRed from state "red".',
    );
    expect(machine.state).toBe("red");
  });

  it("throws for green -> green and keeps state unchanged", () => {
    const machine = new TrafficLight("red");
    machine.goGreen();

    expect(() => machine.goGreen()).toThrow(
      'Cannot transition using goGreen from state "green".',
    );
    expect(machine.state).toBe("green");
  });
});
