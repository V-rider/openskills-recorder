import type { Skill } from "@openskills/core";

export interface SkillVersion {
  id: string;
  version: number;
  artifactPath: string;
  changelog: string | null;
  createdAt: string;
}

export type { Skill };
