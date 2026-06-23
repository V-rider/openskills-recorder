import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
import { mkdir } from "node:fs/promises";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import playwright from "playwright";
import {
  StartRecordingInputSchema,
  ReplayInputSchema,
  AppSettingsSchema,
  SkillSchema,
  getDefaultDataDir,
  getRecordingArtifactDir,
  getReplayLogPath,
  publishRecordingEvent,
  resolveArtifactBaseDir,
  recorderLogger,
} from "@openskills/core";
import { prisma } from "@openskills/db";
import { BrowserRecorder } from "@openskills/recorder";
import { runSynthesis } from "@openskills/synthesis";
import { ReplayEngine, cancelReplay } from "@openskills/replay";

let mainWindow: BrowserWindow | null = null;
let activeRecorder: BrowserRecorder | null = null;
const replayEngine = new ReplayEngine();
let wss: WebSocketServer | null = null;
const wsClients = new Set<WebSocket>();

async function ensureDataDirs() {
  await mkdir(getDefaultDataDir(), { recursive: true });
  const settings = await getSettings();
  await mkdir(resolveArtifactBaseDir(settings), { recursive: true });
}

function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

function startWsServer() {
  const port = Number(process.env.OPENSKILLS_WS_PORT ?? 3847);
  const server = createServer();
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    wsClients.add(ws);
    ws.on("close", () => wsClients.delete(ws));
  });

  server.listen(port, () => {
    recorderLogger.info({ port }, "WebSocket server listening");
  });
}

async function getSettings() {
  const row = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!row) return AppSettingsSchema.parse({});
  return AppSettingsSchema.parse(JSON.parse(row.data));
}

async function saveSettings(data: unknown) {
  const parsed = AppSettingsSchema.parse(data);
  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", data: JSON.stringify(parsed) },
    update: { data: JSON.stringify(parsed) },
  });
  return parsed;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const webUrl = process.env.OPENSKILLS_WEB_URL ?? "http://localhost:3000";
  mainWindow.loadURL(webUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureDataDirs();
  startWsServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("recorder:start", async (_event, input: unknown) => {
  const parsed = StartRecordingInputSchema.parse(input);
  const settings = await getSettings();

  for (const domain of settings.domainBlacklist) {
    if (parsed.startUrl?.includes(domain)) {
      throw new Error(`URL blocked by domain blacklist: ${domain}`);
    }
  }

  const recording = await prisma.recording.create({
    data: {
      name: parsed.name,
      intent: parsed.intent,
      description: parsed.description,
      tags: JSON.stringify(parsed.tags),
      scope: parsed.scope,
      status: "recording",
      artifactDir: getRecordingArtifactDir("pending"),
    },
  });

  const artifactBase = resolveArtifactBaseDir(settings);
  const artifactDir = getRecordingArtifactDir(recording.id, artifactBase);
  await mkdir(artifactDir, { recursive: true });
  await prisma.recording.update({
    where: { id: recording.id },
    data: { artifactDir },
  });

  const sessionRecorder = new BrowserRecorder(async (event) => {
    publishRecordingEvent(recording.id, event);
    await prisma.recordingEvent.create({
      data: {
        recordingId: recording.id,
        sequence: event.sequence,
        type: event.type,
        timestamp: new Date(event.timestamp),
        payload: JSON.stringify(event.payload),
        screenshotPath: event.screenshotPath,
      },
    });
    broadcast({ type: "recording:event", recordingId: recording.id, event });
  }, artifactBase);

  activeRecorder = sessionRecorder;
  await sessionRecorder.start(recording.id, parsed, playwright);

  return { recordingId: recording.id };
});

ipcMain.handle("recorder:stop", async (_event, recordingId: string) => {
  if (!activeRecorder) throw new Error("No active recording");
  const artifact = await activeRecorder.stop();
  activeRecorder = null;
  if (!artifact) throw new Error("No active recording");

  await prisma.recording.update({
    where: { id: recordingId },
    data: { status: "stopped", endedAt: new Date() },
  });

  broadcast({ type: "recording:stopped", recordingId, eventCount: artifact.events.length });
  return artifact;
});

ipcMain.handle("synthesis:run", async (_event, payload: { recordingId: string; useLlm?: boolean }) => {
  const recording = await prisma.recording.findUnique({
    where: { id: payload.recordingId },
    include: { events: { orderBy: { sequence: "asc" } } },
  });
  if (!recording) throw new Error("Recording not found");

  const artifact = {
    id: recording.id,
    name: recording.name,
    intent: recording.intent,
    description: recording.description ?? undefined,
    tags: JSON.parse(recording.tags) as string[],
    scope: recording.scope as "tab" | "session" | "desktop",
    startedAt: recording.startedAt.toISOString(),
    endedAt: recording.endedAt?.toISOString(),
    events: recording.events.map((e) => ({
      id: e.id,
      sequence: e.sequence,
      type: e.type as "click",
      timestamp: e.timestamp.toISOString(),
      payload: JSON.parse(e.payload) as Record<string, unknown>,
      selectors: [] as { strategy: "css"; value: string; confidence: number }[],
      screenshotPath: e.screenshotPath ?? undefined,
    })),
  };

  try {
    const jsonPath = join(getRecordingArtifactDir(recording.id), "recording.json");
    const raw = JSON.parse(await readFile(jsonPath, "utf-8"));
    if (raw.events) artifact.events = raw.events;
  } catch {
    // use DB events
  }

  const settings = await getSettings();
  const artifactBase = resolveArtifactBaseDir(settings);
  const skillId = `skill-${recording.id}`;

  let existingSkill = await prisma.skill.findUnique({ where: { recordingId: recording.id } });
  if (!existingSkill) {
    existingSkill = await prisma.skill.create({
      data: {
        recordingId: recording.id,
        name: recording.name,
        intent: recording.intent,
        description: recording.description,
        tags: recording.tags,
      },
    });
  }

  const lastVersion = await prisma.skillVersion.findFirst({
    where: { skillId: existingSkill.id },
    orderBy: { version: "desc" },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const result = await runSynthesis(
    artifact,
    skillId,
    { useLlm: payload.useLlm ?? settings.llmEnabled },
    artifactBase,
    settings,
  );

  result.skill.version = nextVersion;
  await writeFile(result.skillJsonPath, JSON.stringify(result.skill, null, 2));

  const version = await prisma.skillVersion.create({
    data: {
      skillId: existingSkill.id,
      version: nextVersion,
      artifactPath: result.artifactPath,
      synthesisConfig: JSON.stringify({ useLlm: payload.useLlm ?? false }),
    },
  });

  await prisma.skill.update({
    where: { id: existingSkill.id },
    data: { currentVersionId: version.id },
  });

  await prisma.recording.update({
    where: { id: recording.id },
    data: { status: "synthesized" },
  });

  return { skillId: existingSkill.id, versionId: version.id, skill: result.skill };
});

ipcMain.handle("replay:run", async (_event, input: unknown) => {
  const parsed = ReplayInputSchema.parse(input);
  const version = await prisma.skillVersion.findUnique({
    where: { id: parsed.skillVersionId },
    include: { skill: { include: { recording: true } } },
  });
  if (!version) throw new Error("Skill version not found");

  const skillJson = JSON.parse(await readFile(join(version.artifactPath, "skill.json"), "utf-8"));
  const skill = SkillSchema.parse(skillJson);

  const run = await prisma.replayRun.create({
    data: {
      skillVersionId: version.id,
      status: "running",
      inputs: JSON.stringify(parsed.inputs),
    },
  });

  broadcast({ type: "replay:started", runId: run.id });

  const settings = await getSettings();
  const artifactBase = resolveArtifactBaseDir(settings);
  const screenshotDir = join(artifactBase, version.skill.recordingId, "replays", run.id);

  const result = await replayEngine.run(skill, parsed.inputs, playwright, {
    headless: parsed.headless,
    runId: run.id,
    screenshotDir,
  });

  for (const [i, log] of result.stepLogs.entries()) {
    await prisma.replayStepLog.create({
      data: {
        replayRunId: run.id,
        stepId: log.stepId,
        sequence: i + 1,
        status: log.status,
        message: log.message,
        details: JSON.stringify(log.details ?? {}),
      },
    });
    broadcast({ type: "replay:step", runId: run.id, log });
  }

  const status = result.success ? "success" : result.error === "Replay cancelled" ? "cancelled" : "failed";

  await prisma.replayRun.update({
    where: { id: run.id },
    data: {
      status,
      error: result.error,
      logPath: getReplayLogPath(run.id),
      endedAt: new Date(),
    },
  });

  broadcast({ type: "replay:finished", runId: run.id, success: result.success });
  return { runId: run.id, ...result };
});

ipcMain.handle("replay:cancel", async (_event, runId: string) => {
  const cancelled = cancelReplay(runId);
  if (cancelled) {
    await prisma.replayRun.updateMany({
      where: { id: runId, status: "running" },
      data: { status: "cancelled", endedAt: new Date(), error: "Cancelled by user" },
    });
  }
  return { cancelled };
});

ipcMain.handle("settings:get", async () => getSettings());
ipcMain.handle("settings:save", async (_event, data: unknown) => saveSettings(data));

ipcMain.handle("dialog:permission", async () => {
  const result = await dialog.showMessageBox({
    type: "info",
    title: "Recording Permission",
    message: "OpenSkills Recorder will capture browser interactions.",
    detail: "Actions, URLs, DOM selectors, and screenshots will be stored locally. Avoid recording sensitive credentials.",
    buttons: ["Continue", "Cancel"],
  });
  return result.response === 0;
});
