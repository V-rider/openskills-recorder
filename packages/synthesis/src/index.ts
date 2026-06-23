import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import type { RecordingArtifact, Skill, SynthesisOptions } from "@openskills/core";
import {
  getSkillJsonPath,
  getSkillMdPath,
  getSkillVersionDir,
  getSynthesisLogPath,
  synthesisLogger,
} from "@openskills/core";
import { enhanceSkillWithLlm } from "@openskills/ai";
import { synthesizeSkillFromRecording } from "./heuristic.js";
import { renderSkillMarkdown } from "./render-md.js";

export interface SynthesisResult {
  skill: Skill;
  skillJsonPath: string;
  skillMdPath: string;
  artifactPath: string;
}

export async function runSynthesis(
  artifact: RecordingArtifact,
  skillId: string,
  options: SynthesisOptions = { useLlm: false },
  artifactBaseDir?: string,
  llmSettings?: Parameters<typeof enhanceSkillWithLlm>[1],
): Promise<SynthesisResult> {
  synthesisLogger.info({ recordingId: artifact.id, useLlm: options.useLlm }, "Starting synthesis");
  const started = Date.now();

  let skill = synthesizeSkillFromRecording(artifact, skillId);

  if (options.useLlm && llmSettings) {
    try {
      skill = await enhanceSkillWithLlm(skill, llmSettings);
    } catch (err) {
      synthesisLogger.warn({ err }, "LLM enhancement failed, using heuristic result");
    }
  }

  const version = skill.version;
  const dir = getSkillVersionDir(artifact.id, version, artifactBaseDir);
  await mkdir(dir, { recursive: true });

  const skillJsonPath = getSkillJsonPath(artifact.id, version, artifactBaseDir);
  const skillMdPath = getSkillMdPath(artifact.id, version, artifactBaseDir);
  const markdown = renderSkillMarkdown(skill);

  await writeFile(skillJsonPath, JSON.stringify(skill, null, 2));
  await writeFile(skillMdPath, markdown);
  await copyFile(skillMdPath, join(dir, "SKILL.md"));

  const logPath = getSynthesisLogPath(artifact.id, artifactBaseDir);
  await writeFile(
    logPath,
    JSON.stringify(
      {
        recordingId: artifact.id,
        skillId,
        version,
        steps: skill.steps.length,
        warnings: skill.warnings,
        durationMs: Date.now() - started,
        completedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );

  synthesisLogger.info({ skillId, version, steps: skill.steps.length }, "Synthesis complete");

  return { skill, skillJsonPath, skillMdPath, artifactPath: dir };
}

export { synthesizeSkillFromRecording } from "./heuristic.js";
export { renderSkillMarkdown } from "./render-md.js";
