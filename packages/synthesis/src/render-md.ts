import type { Skill } from "@openskills/core";

export function renderSkillMarkdown(skill: Skill): string {
  const lines: string[] = [
    `# ${skill.name}`,
    "",
    `> ${skill.intent}`,
    "",
    "## When to use",
    skill.whenToUse,
    "",
  ];

  if (skill.description) {
    lines.push("## Description", skill.description, "");
  }

  if (skill.parameters.length > 0) {
    lines.push("## Parameters", "");
    for (const p of skill.parameters) {
      lines.push(`- **${p.name}** (${p.type}${p.required ? ", required" : ""})${p.description ? `: ${p.description}` : ""}`);
      if (p.example) lines.push(`  - Example: \`${p.example}\``);
    }
    lines.push("");
  }

  if (skill.preconditions.length > 0) {
    lines.push("## Preconditions", "");
    for (const p of skill.preconditions) {
      lines.push(`- [${p.type}] ${p.rule}${p.message ? ` — ${p.message}` : ""}`);
    }
    lines.push("");
  }

  lines.push("## Steps", "");
  skill.steps.forEach((step, i) => {
    lines.push(`### ${i + 1}. ${step.description || step.action}`);
    lines.push(`- Action: \`${step.action}\``);
    if (step.value) lines.push(`- Value: \`${step.value}\``);
    if (step.parameterRef) lines.push(`- Parameter: \`{{${step.parameterRef}}}\``);
    if (step.selectors[0]) {
      lines.push(`- Primary selector: \`${step.selectors[0].strategy}:${step.selectors[0].value}\` (confidence ${step.selectors[0].confidence})`);
    }
    lines.push("");
  });

  if (skill.successCriteria.length > 0) {
    lines.push("## Success criteria", "");
    for (const c of skill.successCriteria) {
      lines.push(`- [${c.type}] ${c.rule}${c.message ? ` — ${c.message}` : ""}`);
    }
    lines.push("");
  }

  if (skill.warnings.length > 0) {
    lines.push("## Warnings", "");
    for (const w of skill.warnings) {
      lines.push(`- ⚠️ ${w}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
