import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Locator, Page } from "playwright";
import type {
  SelectorCandidate,
  Skill,
  SkillStep,
  SuccessCriterion,
} from "@openskills/core";
import { getReplayLogPath, replayLogger } from "@openskills/core";
import { cancelReplay, registerReplay, unregisterReplay } from "./cancel-registry.js";

export interface StepLogEntry {
  stepId: string;
  sequence: number;
  status: "success" | "failed" | "skipped" | "cancelled";
  message?: string;
  details?: Record<string, unknown>;
}

export interface ReplayResult {
  success: boolean;
  stepLogs: StepLogEntry[];
  error?: string;
  runId?: string;
}

export interface ReplayOptions {
  headless?: boolean;
  signal?: AbortSignal;
  runId?: string;
  screenshotDir?: string;
}

function resolveValue(step: SkillStep, inputs: Record<string, string | number | boolean>): string | undefined {
  if (step.parameterRef) {
    const val = inputs[step.parameterRef];
    return val !== undefined ? String(val) : undefined;
  }
  return step.value;
}

function getLocator(page: Page, selector: SelectorCandidate): Locator {
  switch (selector.strategy) {
    case "testid":
      return page.locator(selector.value);
    case "aria":
      return page.locator(selector.value);
    case "role": {
      const match = selector.value.match(/^role=(\w+)\[name="(.+)"\]$/);
      if (match) {
        return page.getByRole(match[1] as Parameters<Page["getByRole"]>[0], { name: match[2] });
      }
      return page.locator(selector.value);
    }
    case "text":
      return page.getByText(selector.value, { exact: false });
    case "xpath":
      return page.locator(`xpath=${selector.value}`);
    case "css":
    default:
      return page.locator(selector.value);
  }
}

async function findElement(page: Page, step: SkillStep): Promise<Locator | null> {
  const candidates = [...step.selectors, ...step.fallbacks];
  for (const candidate of candidates) {
    try {
      const locator = getLocator(page, candidate);
      const count = await locator.count();
      if (count > 0) return locator.first();
    } catch {
      continue;
    }
  }
  return null;
}

async function verifyCriterion(page: Page, criterion: SuccessCriterion): Promise<boolean> {
  switch (criterion.type) {
    case "urlContains":
      return page.url().includes(criterion.rule);
    case "urlMatches":
      return new RegExp(criterion.rule).test(page.url());
    case "textVisible":
      return (await page.getByText(criterion.rule).count()) > 0;
    case "elementVisible":
      return (await page.locator(criterion.rule).count()) > 0;
    default:
      return true;
  }
}

async function captureFailureScreenshot(
  page: Page,
  step: SkillStep,
  screenshotDir?: string,
): Promise<string | undefined> {
  if (!screenshotDir) return undefined;
  try {
    await mkdir(screenshotDir, { recursive: true });
    const path = join(screenshotDir, `fail-${step.id}.png`);
    await page.screenshot({ path, fullPage: false });
    return path;
  } catch {
    return undefined;
  }
}

async function executeStep(
  page: Page,
  step: SkillStep,
  inputs: Record<string, string | number | boolean>,
  options: ReplayOptions,
): Promise<StepLogEntry> {
  const sequence = Number(step.id.replace("step-", "")) || 0;
  const retry = step.retry ?? { attempts: 3, delayMs: 500 };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retry.attempts; attempt++) {
    if (options.signal?.aborted) {
      return { stepId: step.id, sequence, status: "cancelled", message: "Replay cancelled" };
    }

    try {
      switch (step.action) {
        case "navigate": {
          const url = resolveValue(step, inputs);
          if (!url) throw new Error("Navigate step missing URL");
          await page.goto(url, { waitUntil: "domcontentloaded" });
          break;
        }
        case "click": {
          const locator = await findElement(page, step);
          if (!locator) throw new Error("No matching element for click");
          await locator.click();
          break;
        }
        case "fill": {
          const locator = await findElement(page, step);
          if (!locator) throw new Error("No matching element for fill");
          const value = resolveValue(step, inputs);
          if (value === undefined) throw new Error(`Missing input for parameter ${step.parameterRef}`);
          await locator.fill(value);
          break;
        }
        case "select": {
          const locator = await findElement(page, step);
          if (!locator) throw new Error("No matching element for select");
          const value = resolveValue(step, inputs);
          if (!value) throw new Error("Select step missing value");
          await locator.selectOption(value);
          break;
        }
        case "keypress": {
          const key = step.value ?? "Enter";
          await page.keyboard.press(key);
          break;
        }
        case "upload": {
          const locator = await findElement(page, step);
          if (!locator) throw new Error("No matching element for upload");
          const filePath = resolveValue(step, inputs);
          if (!filePath) throw new Error(`Missing file path for ${step.parameterRef}`);
          await locator.setInputFiles(filePath);
          break;
        }
        case "wait": {
          await page.waitForTimeout(Number(step.value ?? 1000));
          break;
        }
        case "drag": {
          const payload = step.value ?? "";
          const parts = payload.split(",").map(Number);
          if (parts.length >= 4) {
            await page.mouse.move(parts[0]!, parts[1]!);
            await page.mouse.down();
            await page.mouse.move(parts[2]!, parts[3]!);
            await page.mouse.up();
          } else {
            const locator = await findElement(page, step);
            if (!locator) throw new Error("No matching element for drag");
            const box = await locator.boundingBox();
            if (!box) throw new Error("Element not visible for drag");
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2);
            await page.mouse.up();
          }
          break;
        }
        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      if (step.verify) {
        const ok = await verifyCriterion(page, {
          type: step.verify.type,
          rule: step.verify.rule,
          message: step.verify.message,
        });
        if (!ok) throw new Error(`Step verification failed: ${step.verify.rule}`);
      }

      return { stepId: step.id, sequence, status: "success" };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retry.attempts) {
        await page.waitForTimeout(retry.delayMs);
      }
    }
  }

  const screenshotPath = await captureFailureScreenshot(page, step, options.screenshotDir);

  return {
    stepId: step.id,
    sequence,
    status: "failed",
    message: lastError?.message,
    details: { attempts: retry.attempts, screenshotPath },
  };
}

export class ReplayEngine {
  async run(
    skill: Skill,
    inputs: Record<string, string | number | boolean>,
    playwright: typeof import("playwright"),
    options: ReplayOptions = {},
  ): Promise<ReplayResult> {
    const headless = options.headless ?? false;
    const runId = options.runId ?? `run-${Date.now()}`;
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }
    registerReplay(runId, controller);

    const browser = await playwright.chromium.launch({ headless });
    const context = await browser.newContext();
    const page = await context.newPage();
    const stepLogs: StepLogEntry[] = [];
    const replayOpts: ReplayOptions = {
      ...options,
      signal: controller.signal,
      runId,
    };

    replayLogger.info({ skillId: skill.id, steps: skill.steps.length, runId }, "Replay started");

    try {
      for (const step of skill.steps) {
        if (controller.signal.aborted) {
          stepLogs.push({ stepId: step.id, sequence: stepLogs.length + 1, status: "cancelled" });
          break;
        }
        const log = await executeStep(page, step, inputs, replayOpts);
        stepLogs.push(log);
        replayLogger.debug({ stepId: step.id, status: log.status }, "Step executed");
        if (log.status === "failed" || log.status === "cancelled") {
          await browser.close();
          const result: ReplayResult = {
            success: false,
            stepLogs,
            error: log.message,
            runId,
          };
          await this.writeLog(runId, result);
          unregisterReplay(runId);
          return result;
        }
      }

      if (!controller.signal.aborted) {
        for (const criterion of skill.successCriteria) {
          const ok = await verifyCriterion(page, criterion);
          if (!ok) {
            await browser.close();
            const result: ReplayResult = {
              success: false,
              stepLogs,
              error: `Success criterion failed: ${criterion.rule}`,
              runId,
            };
            await this.writeLog(runId, result);
            unregisterReplay(runId);
            return result;
          }
        }
      }

      await browser.close();
      const result: ReplayResult = {
        success: !controller.signal.aborted,
        stepLogs,
        error: controller.signal.aborted ? "Replay cancelled" : undefined,
        runId,
      };
      await this.writeLog(runId, result);
      unregisterReplay(runId);
      return result;
    } catch (err) {
      await browser.close();
      const message = err instanceof Error ? err.message : String(err);
      const result: ReplayResult = { success: false, stepLogs, error: message, runId };
      await this.writeLog(runId, result);
      unregisterReplay(runId);
      return result;
    }
  }

  private async writeLog(runId: string, result: ReplayResult): Promise<void> {
    try {
      const path = getReplayLogPath(runId);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify({ runId, ...result, writtenAt: new Date().toISOString() }, null, 2));
    } catch (err) {
      replayLogger.warn({ err, runId }, "Failed to write replay log");
    }
  }
}

export { cancelReplay, registerReplay, unregisterReplay };
