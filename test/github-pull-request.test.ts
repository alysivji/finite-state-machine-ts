import { describe, expect, it } from "vitest";
import { StateMachine, transition, type Condition } from "../src/index";

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

    expect(() => pr.merge()).toThrow("Conditions not met for transition merge.");
    expect(pr.state).toBe("approved");
  });
});
