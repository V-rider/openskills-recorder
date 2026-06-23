import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@openskills/db";
import { getRecordingArtifactDir } from "@openskills/core";
import archiver from "archiver";
import { PassThrough } from "node:stream";
import { getArtifactBaseDir } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");

  const skill = await prisma.skill.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" } }, recording: true },
  });
  if (!skill) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const version = versionId
    ? skill.versions.find((v) => v.id === versionId)
    : skill.versions[0];
  if (!version) return NextResponse.json({ error: "No version" }, { status: 404 });

  const artifactPath = version.artifactPath;
  const skillJson = await readFile(join(artifactPath, "skill.json"), "utf-8");
  const skillMd = await readFile(join(artifactPath, "skill.md"), "utf-8").catch(() => "");
  const skillMdSkill = await readFile(join(artifactPath, "SKILL.md"), "utf-8").catch(() => skillMd);
  const skillData = JSON.parse(skillJson) as { name?: string };

  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(passthrough);

  archive.append(skillJson, { name: "skill.json" });
  archive.append(skillMd, { name: "skill.md" });
  archive.append(skillMdSkill, { name: "SKILL.md" });

  const baseDir = await getArtifactBaseDir();
  const screenshotsDir = join(getRecordingArtifactDir(skill.recordingId, baseDir), "screenshots");
  try {
    const files = await readdir(screenshotsDir);
    for (const file of files) {
      if (file.endsWith(".png")) {
        archive.file(join(screenshotsDir, file), { name: `screenshots/${file}` });
      }
    }
  } catch {
    // no screenshots
  }

  await archive.finalize();

  const filename = `${(skillData.name ?? skill.name).replace(/\s+/g, "-")}-v${version.version}.zip`;

  return new NextResponse(passthrough as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
