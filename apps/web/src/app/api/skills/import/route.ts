import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import {
  SkillSchema,
  getSkillVersionDir,
  getSkillJsonPath,
  getSkillMdPath,
} from "@openskills/core";
import { renderSkillMarkdown } from "@openskills/synthesis";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const skill = SkillSchema.parse(body.skill ?? body);

  const recordingId = `import-${randomUUID()}`;
  await prisma.recording.create({
    data: {
      id: recordingId,
      name: skill.name,
      intent: skill.intent,
      description: skill.description,
      tags: JSON.stringify(skill.tags),
      scope: "session",
      status: "synthesized",
    },
  });

  const dbSkill = await prisma.skill.create({
    data: {
      recordingId,
      name: skill.name,
      intent: skill.intent,
      description: skill.description,
      tags: JSON.stringify(skill.tags),
    },
  });

  const version = 1;
  skill.version = version;
  skill.id = dbSkill.id;

  const dir = getSkillVersionDir(recordingId, version);
  await mkdir(dir, { recursive: true });
  await writeFile(getSkillJsonPath(recordingId, version), JSON.stringify(skill, null, 2));
  const md = renderSkillMarkdown(skill);
  await writeFile(getSkillMdPath(recordingId, version), md);
  await copyFile(getSkillMdPath(recordingId, version), join(dir, "SKILL.md"));

  const skillVersion = await prisma.skillVersion.create({
    data: {
      skillId: dbSkill.id,
      version,
      artifactPath: dir,
      changelog: "Imported",
    },
  });

  await prisma.skill.update({
    where: { id: dbSkill.id },
    data: { currentVersionId: skillVersion.id },
  });

  return NextResponse.json({ skillId: dbSkill.id, versionId: skillVersion.id });
}
