import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { cancelReplay } from "@openskills/replay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cancelled = cancelReplay(id);

  if (cancelled) {
    await prisma.replayRun.updateMany({
      where: { id, status: "running" },
      data: { status: "cancelled", endedAt: new Date(), error: "Cancelled by user" },
    });
  }

  return NextResponse.json({ cancelled });
}
