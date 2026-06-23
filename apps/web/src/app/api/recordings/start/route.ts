import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { StartRecordingInputSchema } from "@openskills/core";
import { ensureRecordingDir, getAppSettings } from "@/lib/server/db-helpers";
import { startRecordingSession } from "@/lib/server/recording-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = StartRecordingInputSchema.parse(body);
  const settings = await getAppSettings();

  for (const domain of settings.domainBlacklist) {
    if (parsed.startUrl?.includes(domain)) {
      return NextResponse.json({ error: `URL blocked: ${domain}` }, { status: 400 });
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
    },
  });

  const artifactDir = await ensureRecordingDir(recording.id);
  await prisma.recording.update({
    where: { id: recording.id },
    data: { artifactDir },
  });

  await startRecordingSession(recording.id, parsed, async (event) => {
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
  });

  return NextResponse.json({ recordingId: recording.id });
}
