import { describe, expect, it } from "vitest";
import {
  generateStateDiagram,
  StateMachine,
  type SyncCondition,
  TransitionConditionFailedError,
  transition,
} from "../../src/index";

type PullRequestState = "draft" | "open" | "approved" | "merged" | "closed";

const hasAtLeastOneApproval: SyncCondition<GithubPullRequest> = (machine) =>
  machine.approvals >= 1;

class GithubPullRequest extends StateMachine<PullRequestState> {
  static initialState = "draft" as const;
  approvals = 0;

  @transition<PullRequestState, GithubPullRequest>({
    source: "draft",
    target: "open",
  })
  readyForReview() {}

  @transition<PullRequestState, GithubPullRequest>({
    source: "open",
    target: "draft",
  })
  convertToDraft() {}

  @transition<PullRequestState, GithubPullRequest>({
    source: "open",
    target: "approved",
  })
  approve() {}

  @transition<PullRequestState, GithubPullRequest>({
    source: "approved",
    target: "merged",
    conditions: [hasAtLeastOneApproval],
  })
  merge() {}

  @transition<PullRequestState, GithubPullRequest>({
    source: ["draft", "open", "approved"],
    target: "closed",
  })
  close() {}
}

describe("github pull request example", () => {
  it("follows the documented review and merge flow", () => {
    const pr = new GithubPullRequest();

    pr.readyForReview();
    pr.approve();
    pr.approvals = 1;
    pr.merge();

    expect(pr.state).toBe("merged");
  });

  it("keeps merge guarded by approval count", () => {
    const pr = new GithubPullRequest("draft");
    pr.readyForReview();
    pr.approve();

    expect(() => pr.merge()).toThrow(TransitionConditionFailedError);
    expect(pr.state).toBe("approved");
  });

  it("matches the documented Mermaid diagram", () => {
    expect(
      generateStateDiagram(GithubPullRequest, { initialState: "draft" }),
    ).toBe(
      `stateDiagram-v2
  state "draft" as state_0
  state "open" as state_1
  state "approved" as state_2
  state "merged" as state_3
  state "closed" as state_4
  [*] --> state_0
  state_0 --> state_1: readyForReview
  state_1 --> state_0: convertToDraft
  state_1 --> state_2: approve
  state_2 --> state_3: merge
  state_0 --> state_4: close
  state_1 --> state_4: close
  state_2 --> state_4: close
`,
    );
  });
});
