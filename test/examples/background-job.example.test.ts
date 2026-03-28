import { describe, expect, it } from "vitest";
import {
  FiniteStateMachineError,
  generateStateDiagram,
  StateMachine,
  TransitionExecutionError,
  transition,
} from "../../src/index";

type BackgroundJobState = "queued" | "running" | "completed" | "failed";

class BackgroundJob extends StateMachine<BackgroundJobState> {
  static initialState = "queued" as const;
  shouldFail = false;

  @transition<BackgroundJobState, BackgroundJob>({
    source: "queued",
    target: "running",
  })
  start() {}

  @transition<BackgroundJobState, BackgroundJob>({
    source: "running",
    target: "completed",
    onError: "failed",
  })
  process() {
    if (this.shouldFail) {
      throw new Error("job failed");
    }
  }

  @transition<BackgroundJobState, BackgroundJob>({
    source: "failed",
    target: "queued",
  })
  retry() {}
}

describe("background job example", () => {
  it("runs the documented happy path", () => {
    const job = new BackgroundJob();

    job.start();
    job.process();

    expect(job.state).toBe("completed");
  });

  it("follows the documented error and retry path", () => {
    const job = new BackgroundJob();
    job.start();
    job.shouldFail = true;

    try {
      job.process();
      throw new Error("expected process to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(FiniteStateMachineError);
      expect(error).toBeInstanceOf(TransitionExecutionError);
    }

    expect(job.state).toBe("failed");

    job.retry();
    expect(job.state).toBe("queued");
  });

  it("matches the documented Mermaid diagram", () => {
    expect(
      generateStateDiagram(BackgroundJob, { initialState: "queued" }),
    ).toBe(
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
