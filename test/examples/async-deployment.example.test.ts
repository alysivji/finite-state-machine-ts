import { describe, expect, it } from "vitest";
import {
  ConcurrentTransitionError,
  generateStateDiagram,
  StateMachine,
  TransitionExecutionError,
  transition,
} from "../../src/index";

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

type DeploymentState = "pending" | "running" | "completed" | "failed";

class AsyncDeployment extends StateMachine<DeploymentState> {
  capacityAvailable = true;
  approvalGate = createDeferred<boolean>();
  startGate = createDeferred<string>();
  completeGate = createDeferred<void>();

  constructor(initialState: DeploymentState = "pending") {
    super(initialState);
  }

  @transition<DeploymentState, AsyncDeployment, [], Promise<string>>({
    source: "pending",
    target: "running",
    onError: "failed",
    conditions: [
      async (machine) => {
        const approved = await machine.approvalGate.promise;
        return approved && machine.capacityAvailable;
      },
    ],
  })
  async start() {
    return this.startGate.promise;
  }

  @transition<DeploymentState, AsyncDeployment, [], Promise<void>>({
    source: "running",
    target: "completed",
  })
  async complete() {
    await this.completeGate.promise;
  }
}

describe("async deployment example", () => {
  it("uses await for the documented async happy path", async () => {
    const deployment = new AsyncDeployment("pending");

    const pendingStart = deployment.start();
    expect(deployment.state).toBe("pending");

    deployment.approvalGate.resolve(true);
    deployment.startGate.resolve("started");

    await expect(pendingStart).resolves.toBe("started");
    expect(deployment.state).toBe("running");

    const pendingComplete = deployment.complete();
    expect(deployment.state).toBe("running");

    deployment.completeGate.resolve();
    await pendingComplete;

    expect(deployment.state).toBe("completed");
  });

  it("blocks overlapping async transitions on the same instance", async () => {
    const deployment = new AsyncDeployment("pending");

    const pendingStart = deployment.start();

    expect(() => deployment.start()).toThrow(ConcurrentTransitionError);

    deployment.approvalGate.resolve(true);
    deployment.startGate.resolve("started");
    await pendingStart;
  });

  it("moves to the onError state when async work rejects", async () => {
    const deployment = new AsyncDeployment("pending");

    const pendingStart = deployment.start();
    deployment.approvalGate.resolve(true);
    deployment.startGate.reject(new Error("boot failed"));

    await expect(pendingStart).rejects.toThrow(TransitionExecutionError);
    expect(deployment.state).toBe("failed");
  });

  it("matches the documented Mermaid diagram", () => {
    expect(
      generateStateDiagram(AsyncDeployment, { initialState: "pending" }),
    ).toBe(
      `stateDiagram-v2
  state "pending" as state_0
  state "running" as state_1
  state "failed" as state_2
  state "completed" as state_3
  [*] --> state_0
  state_0 --> state_1: start
  state_0 --> state_2: start (error)
  state_1 --> state_3: complete
`,
    );
  });
});
