import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { ReplayInputSchema, SkillSchema, getReplayLogPath } from "@openskills/core";
import { replayEngine } from "@/lib/server/recording-runtime";
import { getArtifactBaseDir } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ReplayInputSchema.parse(body);

  const version = await prisma.skillVersion.findUnique({
    where: { id: parsed.skillVersionId },
    include: { skill: { include: { recording: true } } },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const skillJson = JSON.parse(await readFile(join(version.artifactPath, "skill.json"), "utf-8"));
  const skill = SkillSchema.parse(skillJson);

  const run = await prisma.replayRun.create({
    data: {
      skillVersionId: version.id,
      status: "running",
      inputs: JSON.stringify(parsed.inputs),
    },
  });

  const baseDir = await getArtifactBaseDir();
  const recordingId = version.skill.recordingId;
  const screenshotDir = join(baseDir, recordingId, "replays", run.id);

  const playwright = await import("playwright");
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

  return NextResponse.json({ runId: run.id, ...result });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skillVersionId = searchParams.get("skillVersionId");
  if (!skillVersionId) {
    return NextResponse.json({ error: "skillVersionId required" }, { status: 400 });
  }

  const runs = await prisma.replayRun.findMany({
    where: { skillVersionId },
    orderBy: { startedAt: "desc" },
    include: { stepLogs: { orderBy: { sequence: "asc" } } },
  });

  return NextResponse.json(runs);
}
