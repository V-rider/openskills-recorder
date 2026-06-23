import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { prisma } from "@openskills/db";
import { SkillSchema } from "@openskills/core";
import { SkillDetailClient } from "@/components/skill-detail-client";

export const dynamic = "force-dynamic";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await prisma.skill.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  if (!skill || skill.deletedAt) notFound();

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

  return (
    <SkillDetailClient
      skillId={id}
      initialData={{
        name: skill.name,
        versions: skill.versions.map((v) => ({
          id: v.id,
          version: v.version,
          artifactPath: v.artifactPath,
          changelog: v.changelog,
          createdAt: v.createdAt.toISOString(),
        })),
        currentSkill,
        currentVersionId: currentVersion?.id ?? null,
      }}
    />
  );
}
