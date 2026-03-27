import { describe, expect, it } from "vitest";
import { generateStateDiagram, StateMachine, transition } from "../src/index";

type BackgroundJobState = "queued" | "running" | "completed" | "failed";

class BackgroundJob extends StateMachine<BackgroundJobState> {
  shouldFail = false;

  constructor(initialState: BackgroundJobState = "queued") {
    super(initialState);
  }

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: "queued",
    target: "running",
  })
  start() {}

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: "running",
    target: "completed",
    on_error: "failed",
  })
  process() {
    if (this.shouldFail) {
      throw new Error("job failed");
    }
  }

  @transition<BackgroundJobState, BackgroundJob, [], void>({
    source: "failed",
    target: "queued",
  })
  retry() {}
}

describe("background job transitions", () => {
  it("moves queued -> running -> completed on success", () => {
    const job = new BackgroundJob("queued");

    job.start();
    expect(job.state).toBe("running");

    job.process();
    expect(job.state).toBe("completed");
  });

  it("moves running -> failed when process throws", () => {
    const job = new BackgroundJob("queued");

    job.start();
    job.shouldFail = true;

    expect(() => job.process()).toThrow("job failed");
    expect(job.state).toBe("failed");
  });

  it("allows retrying a failed job", () => {
    const job = new BackgroundJob("failed");

    job.retry();

    expect(job.state).toBe("queued");
  });

  it("generates a Mermaid state diagram from transition metadata", () => {
    expect(generateStateDiagram(BackgroundJob, { initialState: "queued" })).toBe(
      `stateDiagram-v2
  state "queued" as state_0
  state "running" as state_1
  state "completed" as state_2
  state "failed" as state_3
  [*] --> state_0
  state_0 --> state_1: start
  state_1 --> state_2: process
  state_1 --> state_3: process (error)
  state_3 --> state_0: retry
`,
    );
  });
});
