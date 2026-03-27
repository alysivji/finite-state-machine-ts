import { describe, expect, it } from "vitest";
import {
  type Condition,
  generateStateDiagram,
  StateMachine,
  transition,
} from "../src/index";

type PullRequestState = "draft" | "open" | "approved" | "merged" | "closed";

const hasAtLeastOneApproval: Condition<GithubPullRequest> = (machine) =>
  machine.approvals >= 1;

class GithubPullRequest extends StateMachine<PullRequestState> {
  approvals = 0;

  constructor(initialState: PullRequestState = "draft") {
    super(initialState);
  }

  @transition<PullRequestState, GithubPullRequest, [], void>({
    source: "draft",
    target: "open",
  })
  readyForReview() {}

  @transition<PullRequestState, GithubPullRequest, [], void>({
    source: "open",
    target: "draft",
  })
  convertToDraft() {}

  @transition<PullRequestState, GithubPullRequest, [], void>({
    source: "open",
    target: "approved",
  })
  approve() {}

  @transition<PullRequestState, GithubPullRequest, [], void>({
    source: "approved",
    target: "merged",
    conditions: [hasAtLeastOneApproval],
  })
  merge() {}

  @transition<PullRequestState, GithubPullRequest, [], void>({
    source: ["draft", "open", "approved"],
    target: "closed",
  })
  close() {}
}

describe("github pull request transitions", () => {
  it("supports draft mode transitions", () => {
    const pr = new GithubPullRequest();

    expect(pr.state).toBe("draft");

    pr.readyForReview();
    expect(pr.state).toBe("open");

    pr.convertToDraft();
    expect(pr.state).toBe("draft");
  });

  it("allows approved -> merged with at least one approval", () => {
    const pr = new GithubPullRequest("draft");

    pr.readyForReview();
    pr.approve();
    pr.approvals = 1;
    pr.merge();

    expect(pr.state).toBe("merged");
  });

  it("blocks approved -> merged when approvals are zero", () => {
    const pr = new GithubPullRequest("draft");

    pr.readyForReview();
    pr.approve();

    expect(() => pr.merge()).toThrow(
      "Conditions not met for transition merge.",
    );
    expect(pr.state).toBe("approved");
  });

  it("allows closing from draft, open, and approved", () => {
    const draftPr = new GithubPullRequest("draft");
    draftPr.close();
    expect(draftPr.state).toBe("closed");

    const openPr = new GithubPullRequest("open");
    openPr.close();
    expect(openPr.state).toBe("closed");

    const approvedPr = new GithubPullRequest("approved");
    approvedPr.close();
    expect(approvedPr.state).toBe("closed");
  });

  it("generates a Mermaid state diagram from transition metadata", () => {
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
