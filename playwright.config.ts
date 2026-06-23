import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const rootDir = process.cwd();
const e2eDatabaseUrl = `file:${path.join(rootDir, "openskills-data", "e2e.db")}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @openskills/demo-app dev",
      url: "http://localhost:4321",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "bash scripts/e2e-web-dev.sh",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        DATABASE_URL: e2eDatabaseUrl,
        E2E_FIXTURE_API: "true",
      },
    },
  ],
});
