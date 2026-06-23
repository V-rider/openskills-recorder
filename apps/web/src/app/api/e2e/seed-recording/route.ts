import { writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { RecordingArtifactSchema, getRecordingJsonPath } from "@openskills/core";
import { ensureRecordingDir, getArtifactBaseDir } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.E2E_FIXTURE_API !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = RecordingArtifactSchema.parse(await request.json());

  const recording = await prisma.recording.create({
    data: {
      name: parsed.name,
      intent: parsed.intent,
      description: parsed.description,
      tags: JSON.stringify(parsed.tags),
      scope: parsed.scope,
      status: "stopped",
      startedAt: new Date(parsed.startedAt),
      endedAt: parsed.endedAt ? new Date(parsed.endedAt) : new Date(),
    },
  });

  const artifactDir = await ensureRecordingDir(recording.id);
  await prisma.recording.update({
    where: { id: recording.id },
    data: { artifactDir },
  });

  const artifact = { ...parsed, id: recording.id };
  const baseDir = await getArtifactBaseDir();
  await writeFile(getRecordingJsonPath(recording.id, baseDir), JSON.stringify(artifact, null, 2));

  for (const event of parsed.events) {
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
  }

  return NextResponse.json({ recordingId: recording.id });
}
