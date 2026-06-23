import { describe, it, expect } from "vitest";
import { buildSelectorCandidates, isWeakSelector } from "../src/selectors.js";

describe("buildSelectorCandidates", () => {
  it("prioritizes testid", () => {
    const candidates = buildSelectorCandidates({
      tagName: "button",
      testId: "submit",
      text: "Submit",
    });
    expect(candidates[0]?.strategy).toBe("testid");
    expect(candidates[0]?.confidence).toBeGreaterThan(0.9);
  });

  it("detects weak selectors", () => {
    const candidates = buildSelectorCandidates({ tagName: "div", className: "x" });
    expect(isWeakSelector(candidates)).toBe(true);
  });
});
