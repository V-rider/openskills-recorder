import { homedir } from "node:os";
import { join } from "node:path";
import type { AppSettings } from "./schemas.js";

export function getDefaultDataDir(): string {
  return process.env.OPENSKILLS_DATA_DIR ?? join(homedir(), ".openskills");
}

export function getDefaultArtifactDir(): string {
  return join(getDefaultDataDir(), "artifacts");
}

export function resolveArtifactBaseDir(settings?: Pick<AppSettings, "artifactDir"> | null): string {
  if (settings?.artifactDir?.trim()) {
    return settings.artifactDir.trim();
  }
  return getDefaultArtifactDir();
}

export function getLogsDir(): string {
  return join(getDefaultDataDir(), "logs");
}

export function getReplayLogPath(runId: string): string {
  return join(getLogsDir(), "replays", `${runId}.json`);
}

export function getSynthesisLogPath(recordingId: string, baseDir?: string): string {
  return join(getRecordingArtifactDir(recordingId, baseDir), "synthesis.log");
}

export function getRecordingArtifactDir(recordingId: string, baseDir?: string): string {
  return join(baseDir ?? getDefaultArtifactDir(), recordingId);
}

export function getScreenshotsDir(recordingId: string, baseDir?: string): string {
  return join(getRecordingArtifactDir(recordingId, baseDir), "screenshots");
}

export function getRecordingJsonPath(recordingId: string, baseDir?: string): string {
  return join(getRecordingArtifactDir(recordingId, baseDir), "recording.json");
}

export function getSkillVersionDir(
  recordingId: string,
  version: number,
  baseDir?: string,
): string {
  return join(getRecordingArtifactDir(recordingId, baseDir), "skill", `v${version}`);
}

export function getSkillJsonPath(
  recordingId: string,
  version: number,
  baseDir?: string,
): string {
  return join(getSkillVersionDir(recordingId, version, baseDir), "skill.json");
}

export function getSkillMdPath(
  recordingId: string,
  version: number,
  baseDir?: string,
): string {
  return join(getSkillVersionDir(recordingId, version, baseDir), "skill.md");
}

export function getDefaultDatabaseUrl(): string {
  const dataDir = getDefaultDataDir();
  return process.env.DATABASE_URL ?? `file:${join(dataDir, "openskills.db")}`;
}
