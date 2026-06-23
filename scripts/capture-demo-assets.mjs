#!/usr/bin/env node
/**
 * Capture README demo assets. Requires web dev server at :3000.
 * Usage: node scripts/capture-demo-assets.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "docs", "assets");
const baseURL = process.env.OPENSKILLS_CAPTURE_URL ?? "http://localhost:3000";

async function assertServerUp() {
  try {
    const res = await fetch(baseURL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error(`Cannot reach ${baseURL}. Start dev first:\n  pnpm dev`);
    process.exit(1);
  }
}

async function importDemoSkill() {
  const skill = JSON.parse(await readFile(join(ROOT, "fixtures/expense-skill.json"), "utf-8"));
  const res = await fetch(`${baseURL}/api/skills/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill }),
  });
  if (!res.ok) throw new Error(`Import failed: ${await res.text()}`);
  return res.json();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await assertServerUp();

  const browser = await chromium.launch();
  const viewport = { width: 1280, height: 800 };

  const dash = await browser.newPage({ viewport });
  await dash.goto(baseURL);
  await dash.waitForLoadState("networkidle");
  await dash.screenshot({ path: join(OUT, "dashboard.png") });
  await dash.close();
  console.log("Wrote docs/assets/dashboard.png");

  const { skillId } = await importDemoSkill();
  const editor = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await editor.goto(`${baseURL}/skills/${skillId}`);
  await editor.waitForLoadState("networkidle");
  await editor.waitForTimeout(500);
  await editor.screenshot({ path: join(OUT, "skill-editor.png") });
  await editor.close();
  console.log("Wrote docs/assets/skill-editor.png");

  const videoPage = await browser.newPage({
    viewport,
    recordVideo: { dir: OUT, size: viewport },
  });
  await videoPage.goto(baseURL);
  await videoPage.waitForTimeout(800);
  await videoPage.getByRole("main").getByRole("link", { name: "New Recording" }).click();
  await videoPage.waitForTimeout(1200);
  await videoPage.goto(`${baseURL}/skills/${skillId}`);
  await videoPage.waitForTimeout(1500);
  const video = videoPage.video();
  await videoPage.close();
  if (video) {
    await video.saveAs(join(OUT, "demo-flow.webm"));
    console.log("Wrote docs/assets/demo-flow.webm");
  }

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
