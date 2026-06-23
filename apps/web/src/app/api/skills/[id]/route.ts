import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { SkillSchema, getSkillVersionDir, getSkillJsonPath, getSkillMdPath } from "@openskills/core";
import { renderSkillMarkdown } from "@openskills/synthesis";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const skill = await prisma.skill.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { version: "desc" } },
      recording: true,
    },
  });
  if (!skill || skill.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let currentSkill = null;
  const currentVersion = skill.versions.find((v) => v.id === skill.currentVersionId) ?? skill.versions[0];
  if (currentVersion) {
    try {
      const raw = await readFile(join(currentVersion.artifactPath, "skill.json"), "utf-8");
      currentSkill = SkillSchema.parse(JSON.parse(raw));
    } catch {
      // no artifact
    }
  }

  return NextResponse.json({ ...skill, currentSkill, currentVersion });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const skill = await prisma.skill.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!skill) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.skill) {
    const parsed = SkillSchema.parse(body.skill);
    const lastVersion = skill.versions[0];
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const { mkdir, writeFile, copyFile } = await import("node:fs/promises");

    parsed.version = nextVersion;
    const dir = getSkillVersionDir(skill.recordingId, nextVersion);
    await mkdir(dir, { recursive: true });
    const jsonPath = getSkillJsonPath(skill.recordingId, nextVersion);
    const mdPath = getSkillMdPath(skill.recordingId, nextVersion);
    await writeFile(jsonPath, JSON.stringify(parsed, null, 2));
    await writeFile(mdPath, renderSkillMarkdown(parsed));
    await copyFile(mdPath, join(dir, "SKILL.md"));

    const version = await prisma.skillVersion.create({
      data: {
        skillId: id,
        version: nextVersion,
        artifactPath: dir,
        changelog: body.changelog ?? "Manual edit",
      },
    });

    await prisma.skill.update({
      where: { id },
      data: {
        currentVersionId: version.id,
        name: parsed.name,
        intent: parsed.intent,
        description: parsed.description,
        tags: JSON.stringify(parsed.tags),
      },
    });

    return NextResponse.json({ versionId: version.id, skill: parsed });
  }

  await prisma.skill.update({
    where: { id },
    data: {
      name: body.name,
      intent: body.intent,
      description: body.description,
      tags: body.tags ? JSON.stringify(body.tags) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.skill.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
