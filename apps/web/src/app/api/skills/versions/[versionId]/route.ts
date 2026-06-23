import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { SkillSchema } from "@openskills/core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  const version = await prisma.skillVersion.findUnique({
    where: { id: versionId },
    include: { skill: true },
  });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = JSON.parse(await readFile(join(version.artifactPath, "skill.json"), "utf-8"));
  const skill = SkillSchema.parse(raw);

  return NextResponse.json({
    versionId: version.id,
    version: version.version,
    changelog: version.changelog,
    skill,
  });
}
