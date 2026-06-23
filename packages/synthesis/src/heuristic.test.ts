import { describe, it, expect } from "vitest";
import { synthesizeSkillFromRecording } from "../src/heuristic.js";
import type { RecordingArtifact } from "@openskills/core";

const artifact: RecordingArtifact = {
  id: "rec-1",
  name: "Test skill",
  intent: "Submit form",
  tags: ["demo"],
  scope: "session",
  startedAt: new Date().toISOString(),
  events: [
    {
      id: "e1",
      sequence: 1,
      type: "navigate",
      timestamp: new Date().toISOString(),
      url: "http://localhost/success",
      payload: { to: "http://localhost/form" },
      selectors: [],
    },
    {
      id: "e2",
      sequence: 2,
      type: "input",
      timestamp: new Date().toISOString(),
      payload: {
        element: { name: "Email", placeholder: "email" },
        value: "test@example.com",
      },
      selectors: [{ strategy: "testid", value: '[data-testid="email"]', confidence: 0.95 }],
    },
    {
      id: "e3",
      sequence: 3,
      type: "click",
      timestamp: new Date().toISOString(),
      payload: { element: { name: "Submit" } },
      selectors: [{ strategy: "testid", value: '[data-testid="submit"]', confidence: 0.95 }],
      visibleText: "Submit",
    },
  ],
};

describe("synthesizeSkillFromRecording", () => {
  it("creates fill and click steps with parameters", () => {
    const skill = synthesizeSkillFromRecording(artifact, "skill-1");
    expect(skill.steps.length).toBeGreaterThanOrEqual(2);
    expect(skill.parameters.length).toBe(1);
    expect(skill.parameters[0]?.name).toBe("email");
    expect(skill.successCriteria.length).toBeGreaterThan(0);
  });

  it("handles drag events", () => {
    const withDrag = {
      ...artifact,
      events: [
        ...artifact.events,
        {
          id: "e4",
          sequence: 4,
          type: "drag" as const,
          timestamp: new Date().toISOString(),
          payload: {
            from: { x: 10, y: 20 },
            to: { x: 100, y: 120 },
            element: { name: "Slider" },
          },
          selectors: [{ strategy: "css" as const, value: ".slider", confidence: 0.7 }],
        },
      ],
    };
    const skill = synthesizeSkillFromRecording(withDrag, "skill-2");
    expect(skill.steps.some((s) => s.action === "drag")).toBe(true);
  });
});
