import { describe, expect, it } from "vitest";
import {
  FiniteStateMachineError,
  generateStateDiagram,
  StateMachine,
  TransitionExecutionError,
  transition,
} from "../src/index";

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
    onError: "failed",
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

class Deployment extends StateMachine<"pending" | "running" | "completed"> {
  constructor(initialState: "pending" | "running" | "completed" = "pending") {
    super(initialState);
  }

  @transition<"pending" | "running" | "completed", Deployment>({
    source: "pending",
    target: "running",
  })
  start() {
    throw new Error("boot failed");
  }
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

    expect(() => job.process()).toThrow(FiniteStateMachineError);
    expect(job.state).toBe("failed");
  });

  it("wraps execution failures in TransitionExecutionError", () => {
    const job = new BackgroundJob("queued");
    job.start();
    job.shouldFail = true;

    expect(() => job.process()).toThrow(TransitionExecutionError);
    expect(() => {
      const failingJob = new BackgroundJob("queued");
      failingJob.start();
      failingJob.shouldFail = true;
      failingJob.process();
    }).toThrow(
      'Transition process failed while moving from "running" to "completed".',
    );
  });

  it("preserves the original thrown error as the cause", () => {
    const job = new BackgroundJob("queued");
    job.start();
    job.shouldFail = true;

    try {
      job.process();
      throw new Error("expected process to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TransitionExecutionError);
      expect(
        (error as TransitionExecutionError<BackgroundJobState>).cause,
      ).toBeInstanceOf(Error);
      expect(
        ((error as TransitionExecutionError<BackgroundJobState>).cause as Error)
          .message,
      ).toBe("job failed");
    }
  });

  it("keeps the current state when execution fails without onError", () => {
    const deployment = new Deployment("pending");

    expect(() => deployment.start()).toThrow(TransitionExecutionError);
    expect(() => deployment.start()).toThrow(
      'Transition start failed while moving from "pending" to "running".',
    );
    expect(deployment.state).toBe("pending");
  });

  it("allows retrying a failed job", () => {
    const job = new BackgroundJob("failed");

    job.retry();

    expect(job.state).toBe("queued");
  });

  it("generates a Mermaid state diagram from transition metadata", () => {
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
