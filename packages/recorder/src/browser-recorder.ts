import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Browser, BrowserContext, Page } from "playwright";
import {
  type RawRecordingEvent,
  type RecordingArtifact,
  type RecordingScope,
  type StartRecordingInput,
  recorderLogger,
  getRecordingArtifactDir,
  getRecordingJsonPath,
  getScreenshotsDir,
} from "@openskills/core";
import { buildSelectorCandidates } from "./selectors.js";
import { RECORDER_INIT_SCRIPT } from "./inject-script.js";

export type RecordingEventHandler = (event: RawRecordingEvent) => void | Promise<void>;

export interface RecordingSession {
  recordingId: string;
  scope: RecordingScope;
  browser: Browser | null;
  context: BrowserContext;
  page: Page;
  events: RawRecordingEvent[];
  startedAt: string;
  meta: StartRecordingInput;
  userDataDir?: string;
}

export class BrowserRecorder {
  private session: RecordingSession | null = null;
  private screenshotTimers = new Map<string, NodeJS.Timeout>();
  private artifactBaseDir?: string;
  private boundPages = new WeakSet<Page>();

  constructor(private onEvent?: RecordingEventHandler, artifactBaseDir?: string) {
    this.artifactBaseDir = artifactBaseDir;
  }

  get activeSession(): RecordingSession | null {
    return this.session;
  }

  private async bindPage(page: Page, events: RawRecordingEvent[], recordingId: string) {
    if (this.boundPages.has(page)) return;
    this.boundPages.add(page);
    await page.addInitScript(RECORDER_INIT_SCRIPT);
    await page.exposeFunction("__openskillsOnEvent", async (raw: Record<string, unknown>) => {
      const event = await this.processRawEvent(recordingId, page, raw, events.length + 1);
      events.push(event);
      await this.onEvent?.(event);
    });
  }

  async start(
    recordingId: string,
    input: StartRecordingInput,
    playwright: typeof import("playwright"),
  ): Promise<RecordingSession> {
    if (this.session) {
      throw new Error("Recording already in progress");
    }

    const events: RawRecordingEvent[] = [];
    const startedAt = new Date().toISOString();
    const scope = input.scope;
    let browser: Browser | null = null;
    let context: BrowserContext;
    let page: Page;
    let userDataDir: string | undefined;

    if (scope === "session") {
      userDataDir = await mkdtemp(join(tmpdir(), "openskills-session-"));
      context = await playwright.chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        acceptDownloads: true,
        args: ["--disable-blink-features=AutomationControlled"],
      });
      page = context.pages()[0] ?? (await context.newPage());
      await this.bindPage(page, events, recordingId);

      context.on("page", async (newPage) => {
        if (!this.session) return;
        await this.bindPage(newPage, events, recordingId);
      });
    } else {
      browser = await playwright.chromium.launch({
        headless: false,
        args: ["--disable-blink-features=AutomationControlled"],
      });
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        acceptDownloads: true,
      });
      page = await context.newPage();
      await this.bindPage(page, events, recordingId);
      // tab scope: only record the initial page, ignore new tabs
    }

    const startUrl = input.startUrl ?? "about:blank";
    if (startUrl !== "about:blank") {
      await page.goto(startUrl);
    }

    this.session = {
      recordingId,
      scope,
      browser,
      context,
      page,
      events,
      startedAt,
      meta: input,
      userDataDir,
    };

    recorderLogger.info({ recordingId, scope }, "Recording started");
    return this.session;
  }

  private async processRawEvent(
    recordingId: string,
    page: Page,
    raw: Record<string, unknown>,
    sequence: number,
  ): Promise<RawRecordingEvent> {
    const element = raw.payload &&
      typeof raw.payload === "object" &&
      raw.payload !== null &&
      "element" in raw.payload
      ? (raw.payload as { element?: Record<string, unknown> }).element
      : undefined;

    const selectors = element
      ? buildSelectorCandidates({
          tagName: String(element.tagName ?? "div"),
          id: element.id as string | undefined,
          className: element.className as string | undefined,
          testId: element.testId as string | undefined,
          ariaLabel: element.ariaLabel as string | undefined,
          role: element.role as string | undefined,
          name: element.name as string | undefined,
          placeholder: element.placeholder as string | undefined,
          type: element.type as string | undefined,
          text: element.text as string | undefined,
          xpath: element.xpath as string | undefined,
          inIframe: Boolean(element.inIframe),
        })
      : [];

    const event: RawRecordingEvent = {
      id: String(raw.id ?? `evt-${sequence}`),
      sequence,
      type: raw.type as RawRecordingEvent["type"],
      timestamp: String(raw.timestamp ?? new Date().toISOString()),
      url: raw.url as string | undefined,
      payload: (raw.payload as Record<string, unknown>) ?? {},
      selectors,
      visibleText: element?.text as string | undefined,
    };

    await this.scheduleScreenshot(recordingId, page, event);
    return event;
  }

  private async scheduleScreenshot(
    recordingId: string,
    page: Page,
    event: RawRecordingEvent,
  ): Promise<void> {
    const key = event.id;
    const existing = this.screenshotTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        const dir = getScreenshotsDir(recordingId, this.artifactBaseDir);
        await mkdir(dir, { recursive: true });
        const filename = `step-${String(event.sequence).padStart(3, "0")}.png`;
        const path = join(dir, filename);
        await page.screenshot({ path, fullPage: false });
        event.screenshotPath = path;
        this.screenshotTimers.delete(key);
      } catch (err) {
        recorderLogger.warn({ err, eventId: event.id }, "Screenshot failed");
      }
    }, 300);

    this.screenshotTimers.set(key, timer);
  }

  async stop(): Promise<RecordingArtifact | null> {
    if (!this.session) return null;

    for (const timer of this.screenshotTimers.values()) {
      clearTimeout(timer);
    }
    this.screenshotTimers.clear();

    const { recordingId, events, startedAt, meta, browser, context } = this.session;
    const endedAt = new Date().toISOString();

    const artifact: RecordingArtifact = {
      id: recordingId,
      name: meta.name,
      intent: meta.intent,
      description: meta.description,
      tags: meta.tags,
      scope: meta.scope,
      startedAt,
      endedAt,
      events,
    };

    const dir = getRecordingArtifactDir(recordingId, this.artifactBaseDir);
    await mkdir(dir, { recursive: true });
    await writeFile(getRecordingJsonPath(recordingId, this.artifactBaseDir), JSON.stringify(artifact, null, 2));

    await context.close();
    if (browser) await browser.close();
    this.session = null;

    recorderLogger.info({ recordingId, eventCount: events.length }, "Recording stopped");
    return artifact;
  }
}
