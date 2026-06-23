import { describe, it, expect } from "vitest";
import { diffSkills } from "../src/skill-diff.js";
import type { Skill } from "../src/schemas.js";

const base: Skill = {
  id: "s1",
  name: "Test",
  intent: "Do thing",
  version: 1,
  tags: [],
  whenToUse: "When needed",
  parameters: [{ name: "email", type: "string", required: true }],
  preconditions: [],
  steps: [{ id: "step-1", action: "click", selectors: [], fallbacks: [] }],
  successCriteria: [],
  warnings: [],
};

describe("diffSkills", () => {
  it("detects parameter changes", () => {
    const updated: Skill = {
      ...base,
      parameters: [{ name: "email", type: "string", required: true, description: "User email" }],
    };
    const diff = diffSkills(base, updated);
    expect(diff.some((d) => d.field.startsWith("parameters."))).toBe(true);
  });

  it("detects added steps", () => {
    const updated: Skill = {
      ...base,
      steps: [
        ...base.steps,
        { id: "step-2", action: "navigate", selectors: [], fallbacks: [], value: "http://x" },
      ],
    };
    const diff = diffSkills(base, updated);
    expect(diff.some((d) => d.type === "added")).toBe(true);
  });
});
