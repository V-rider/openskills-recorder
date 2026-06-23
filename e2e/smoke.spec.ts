import { test, expect } from "@playwright/test";

test("dashboard loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OpenSkills Recorder" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "New Recording" })).toBeVisible();
});

test("skills page loads", async ({ page }) => {
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: "Skill Library" })).toBeVisible();
});

test("new recording form", async ({ page }) => {
  await page.goto("/recordings/new");
  await expect(page.getByLabel("Skill name")).toBeVisible();
  await page.getByLabel("Skill name").fill("E2E test");
  await page.getByLabel("Short intent").fill("Test intent");
});
