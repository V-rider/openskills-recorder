#!/usr/bin/env node
/**
 * Package fixtures/expense-skill.json into an importable ZIP.
 * Usage: node scripts/package-example-skill.mjs
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STAGING = join(ROOT, "fixtures", "expense-skill-pack");
const OUT_ZIP = join(ROOT, "fixtures", "expense-skill.zip");

function renderMinimalMd(skill) {
  const lines = [
    `# ${skill.name}`,
    "",
    `> ${skill.intent}`,
    "",
    "## When to use",
    skill.whenToUse,
    "",
    "## Parameters",
    "",
  ];
  for (const p of skill.parameters ?? []) {
    lines.push(`- **${p.name}** (${p.type}): example \`${p.example ?? ""}\``);
  }
  lines.push("", "## Steps", "", `${skill.steps?.length ?? 0} steps — see skill.json`, "");
  return lines.join("\n");
}

async function main() {
  const skill = JSON.parse(await readFile(join(ROOT, "fixtures/expense-skill.json"), "utf-8"));
  const md = renderMinimalMd(skill);

  await rm(STAGING, { recursive: true, force: true });
  await mkdir(STAGING, { recursive: true });
  await writeFile(join(STAGING, "skill.json"), JSON.stringify(skill, null, 2));
  await writeFile(join(STAGING, "skill.md"), md);
  await writeFile(join(STAGING, "SKILL.md"), md);

  execSync(`zip -j "${OUT_ZIP}" "${join(STAGING, "skill.json")}" "${join(STAGING, "skill.md")}" "${join(STAGING, "SKILL.md")}"`, {
    stdio: "inherit",
  });

  console.log(`Created ${OUT_ZIP}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
