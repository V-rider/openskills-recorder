import { prisma } from "@openskills/db";
import {
  AppSettingsSchema,
  getRecordingArtifactDir,
  resolveArtifactBaseDir,
} from "@openskills/core";
import { mkdir } from "node:fs/promises";

export async function getAppSettings() {
  const row = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!row) return AppSettingsSchema.parse({});
  return AppSettingsSchema.parse(JSON.parse(row.data));
}

export async function saveAppSettings(data: unknown) {
  const parsed = AppSettingsSchema.parse(data);
  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", data: JSON.stringify(parsed) },
    update: { data: JSON.stringify(parsed) },
  });
  return parsed;
}

export async function getArtifactBaseDir() {
  const settings = await getAppSettings();
  return resolveArtifactBaseDir(settings);
}

export async function ensureRecordingDir(recordingId: string) {
  const baseDir = await getArtifactBaseDir();
  const dir = getRecordingArtifactDir(recordingId, baseDir);
  await mkdir(dir, { recursive: true });
  return dir;
}

export { resolveArtifactBaseDir };
