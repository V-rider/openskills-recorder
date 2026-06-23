import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { SkillSchema, diffSkills } from "@openskills/core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  const { searchParams } = new URL(request.url);
  const against = searchParams.get("against");
  if (!against) {
    return NextResponse.json({ error: "against query param required" }, { status: 400 });
  }

  const [versionA, versionB] = await Promise.all([
    prisma.skillVersion.findUnique({ where: { id: versionId } }),
    prisma.skillVersion.findUnique({ where: { id: against } }),
  ]);

  if (!versionA || !versionB) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const skillA = SkillSchema.parse(
    JSON.parse(await readFile(join(versionA.artifactPath, "skill.json"), "utf-8")),
  );
  const skillB = SkillSchema.parse(
    JSON.parse(await readFile(join(versionB.artifactPath, "skill.json"), "utf-8")),
  );

  return NextResponse.json({
    from: versionA.version,
    to: versionB.version,
    diff: diffSkills(skillA, skillB),
  });
}
