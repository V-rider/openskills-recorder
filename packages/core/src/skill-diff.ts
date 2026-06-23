import type { Skill, SkillParameter, SkillStep, SuccessCriterion } from "./schemas.js";

export interface DiffEntry {
  field: string;
  type: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export function diffSkills(before: Skill, after: Skill): DiffEntry[] {
  const entries: DiffEntry[] = [];

  if (before.name !== after.name) {
    entries.push({ field: "name", type: "changed", before: before.name, after: after.name });
  }
  if (before.intent !== after.intent) {
    entries.push({ field: "intent", type: "changed", before: before.intent, after: after.intent });
  }
  if (before.whenToUse !== after.whenToUse) {
    entries.push({ field: "whenToUse", type: "changed", before: before.whenToUse, after: after.whenToUse });
  }

  entries.push(...diffById(before.parameters, after.parameters, "parameters", (p) => p.name));
  entries.push(...diffById(before.steps, after.steps, "steps", (s) => s.id));
  entries.push(...diffById(before.successCriteria, after.successCriteria, "successCriteria", (c, i) => `${c.type}-${i}`));

  return entries;
}

function diffById<T>(
  before: T[],
  after: T[],
  prefix: string,
  keyFn: (item: T, index: number) => string,
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const beforeMap = new Map(before.map((item, i) => [keyFn(item, i), item]));
  const afterMap = new Map(after.map((item, i) => [keyFn(item, i), item]));

  for (const [key, item] of beforeMap) {
    if (!afterMap.has(key)) {
      entries.push({ field: `${prefix}.${key}`, type: "removed", before: item });
    } else if (JSON.stringify(item) !== JSON.stringify(afterMap.get(key))) {
      entries.push({ field: `${prefix}.${key}`, type: "changed", before: item, after: afterMap.get(key) });
    }
  }

  for (const [key, item] of afterMap) {
    if (!beforeMap.has(key)) {
      entries.push({ field: `${prefix}.${key}`, type: "added", after: item });
    }
  }

  return entries;
}

export type { SkillParameter, SkillStep, SuccessCriterion };
