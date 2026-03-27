import { describe, it, expect } from "vitest";
import { hello } from "../src/index";

describe("hello", () => {
  it("works", () => {
    expect(hello()).toBe("fsm");
  });
});
