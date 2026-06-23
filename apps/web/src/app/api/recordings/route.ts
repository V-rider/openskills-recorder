import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const recordings = await prisma.recording.findMany({
    orderBy: { createdAt: "desc" },
    include: { skill: true, _count: { select: { events: true } } },
  });
  return NextResponse.json(recordings);
}
