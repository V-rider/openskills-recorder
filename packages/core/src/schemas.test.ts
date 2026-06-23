import { describe, it, expect } from "vitest";
import { SkillSchema } from "../src/schemas.js";

describe("SkillSchema", () => {
  it("validates minimal skill", () => {
    const skill = SkillSchema.parse({
      id: "s1",
      name: "Test",
      intent: "Do thing",
      version: 1,
      whenToUse: "When needed",
      steps: [{ id: "step-1", action: "navigate", selectors: [], fallbacks: [], value: "http://x" }],
    });
    expect(skill.name).toBe("Test");
  });
});
