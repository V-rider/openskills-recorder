import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  const skills = await prisma.skill.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { intent: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      recording: true,
    },
  });

  const filtered = tag
    ? skills.filter((s) => (JSON.parse(s.tags) as string[]).includes(tag))
    : skills;

  return NextResponse.json(filtered);
}
