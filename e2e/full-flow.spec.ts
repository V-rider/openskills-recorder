import { readFile } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

test("full flow: import skill and replay on demo app", async ({ request }) => {
  const skillJson = await new Promise<string>((resolve, reject) => {
    readFile(join(__dirname, "../fixtures/expense-skill.json"), "utf-8", (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const importRes = await request.post("/api/skills/import", {
    data: { skill: JSON.parse(skillJson) },
  });
  expect(importRes.ok()).toBeTruthy();
  const imported = await importRes.json();
  expect(imported.skillId).toBeTruthy();
  expect(imported.versionId).toBeTruthy();

  const replayRes = await request.post("/api/replays", {
    data: {
      skillVersionId: imported.versionId,
      inputs: { email: "e2e@example.com", amount: "99" },
      headless: true,
    },
  });
  expect(replayRes.ok()).toBeTruthy();
  const replay = await replayRes.json();
  expect(replay.success).toBe(true);
  expect(replay.stepLogs?.length).toBeGreaterThan(0);
});

test("full flow: synthesize from recording fixture", async ({ request }) => {
  const recordingFixture = {
    id: "e2e-rec",
    name: "E2E Recording",
    intent: "Demo form",
    tags: ["e2e"],
    scope: "session",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    events: [
      {
        id: "e1",
        sequence: 1,
        type: "navigate",
        timestamp: new Date().toISOString(),
        url: "http://localhost:4321",
        payload: { to: "http://localhost:4321" },
        selectors: [],
      },
      {
        id: "e2",
        sequence: 2,
        type: "input",
        timestamp: new Date().toISOString(),
        payload: { element: { name: "Email", placeholder: "email" }, value: "a@b.com" },
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

  const seedRes = await request.post("/api/e2e/seed-recording", {
    data: recordingFixture,
  });
  expect(seedRes.ok()).toBeTruthy();
  const { recordingId } = await seedRes.json();

  const synthRes = await request.post(`/api/recordings/${recordingId}/synthesize`, {
    data: { useLlm: false },
  });
  expect(synthRes.ok()).toBeTruthy();
  const synth = await synthRes.json();
  expect(synth.skill?.steps?.length).toBeGreaterThan(0);
});
