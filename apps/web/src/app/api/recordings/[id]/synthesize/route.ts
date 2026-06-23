import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { SkillSchema, getRecordingArtifactDir } from "@openskills/core";
import { runSynthesis } from "@openskills/synthesis";
import { getAppSettings, getArtifactBaseDir } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const useLlm = Boolean(body.useLlm);

  const recording = await prisma.recording.findUnique({
    where: { id },
    include: { events: { orderBy: { sequence: "asc" } } },
  });
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let events = recording.events.map((e) => ({
    id: e.id,
    sequence: e.sequence,
    type: e.type as "click",
    timestamp: e.timestamp.toISOString(),
    url: undefined as string | undefined,
    payload: JSON.parse(e.payload) as Record<string, unknown>,
    selectors: [] as { strategy: "css"; value: string; confidence: number }[],
    screenshotPath: e.screenshotPath ?? undefined,
  }));

  try {
    const raw = JSON.parse(
      await readFile(join(getRecordingArtifactDir(id), "recording.json"), "utf-8"),
    );
    if (raw.events) events = raw.events;
  } catch {
    // use DB events
  }

  const artifact = {
    id: recording.id,
    name: recording.name,
    intent: recording.intent,
    description: recording.description ?? undefined,
    tags: JSON.parse(recording.tags) as string[],
    scope: recording.scope as "tab" | "session" | "desktop",
    startedAt: recording.startedAt.toISOString(),
    endedAt: recording.endedAt?.toISOString(),
    events,
  };

  const settings = await getAppSettings();
  const skillId = `skill-${recording.id}`;

  let skill = await prisma.skill.findUnique({ where: { recordingId: id } });
  if (!skill) {
    skill = await prisma.skill.create({
      data: {
        recordingId: id,
        name: recording.name,
        intent: recording.intent,
        description: recording.description,
        tags: recording.tags,
      },
    });
  }

  const lastVersion = await prisma.skillVersion.findFirst({
    where: { skillId: skill.id },
    orderBy: { version: "desc" },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const result = await runSynthesis(
    artifact,
    skillId,
    { useLlm: useLlm || settings.llmEnabled },
    await getArtifactBaseDir(),
    settings,
  );

  result.skill.version = nextVersion;
  await writeFile(result.skillJsonPath, JSON.stringify(result.skill, null, 2));

  const version = await prisma.skillVersion.create({
    data: {
      skillId: skill.id,
      version: nextVersion,
      artifactPath: result.artifactPath,
      synthesisConfig: JSON.stringify({ useLlm }),
    },
  });

  await prisma.skill.update({
    where: { id: skill.id },
    data: { currentVersionId: version.id },
  });

  await prisma.recording.update({
    where: { id },
    data: { status: "synthesized" },
  });

  return NextResponse.json({
    skillId: skill.id,
    versionId: version.id,
    skill: SkillSchema.parse(result.skill),
  });
}
