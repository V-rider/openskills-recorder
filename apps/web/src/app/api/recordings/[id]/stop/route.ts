import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { clearRecorder, getActiveRecorder } from "@/lib/server/recording-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recorder = getActiveRecorder(id);
  if (!recorder) {
    return NextResponse.json({ error: "No active recording session" }, { status: 400 });
  }

  const artifact = await recorder.stop();
  clearRecorder(id);

  await prisma.recording.update({
    where: { id },
    data: { status: "stopped", endedAt: new Date() },
  });

  return NextResponse.json(artifact);
}
