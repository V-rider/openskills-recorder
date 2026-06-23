import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recording = await prisma.recording.findUnique({
    where: { id },
    include: { events: { orderBy: { sequence: "asc" } }, skill: { include: { versions: true } } },
  });
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recording);
}
