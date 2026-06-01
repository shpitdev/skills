#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(repoRoot, "skills");
const allowedFrontmatterKeys = new Set(["name", "description"]);
const maxIconBytes = 256 * 1024;

const failures = [];

for (const skillName of await listSkillNames()) {
  await validateSkill(skillName);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Validated skills.");

async function validateSkill(skillName) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillFile = path.join(skillDir, "SKILL.md");

  if (!existsSync(skillFile)) {
    failures.push(`${skillName}: missing SKILL.md`);
    return;
  }

  const markdown = await readFile(skillFile, "utf8");
  const frontmatter = parseFrontmatter(skillName, markdown);
  if (!frontmatter) {
    return;
  }

  if (frontmatter.name !== skillName) {
    failures.push(`${skillName}: frontmatter name must match directory name`);
  }

  if (!frontmatter.description || frontmatter.description.length < 40) {
    failures.push(`${skillName}: description must clearly explain when to use the skill`);
  }

  if (/Generated from|Do not edit/i.test(markdown)) {
    failures.push(`${skillName}: generated-skill marker found; skills must be hand-authored`);
  }

  const agentMetadata = path.join(skillDir, "agents", "openai.yaml");
  if (existsSync(agentMetadata)) {
    await validateOpenAiYaml(skillName, agentMetadata);
  }
}

function parseFrontmatter(skillName, markdown) {
  const match = markdown.match(/^---\n(?<body>[\s\S]*?)\n---\n/);
  if (!match?.groups?.body) {
    failures.push(`${skillName}: missing or malformed YAML frontmatter`);
    return null;
  }

  let result;
  try {
    result = parse(match.groups.body);
  } catch (error) {
    failures.push(`${skillName}: invalid frontmatter YAML: ${error.message}`);
    return null;
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    failures.push(`${skillName}: frontmatter must be a YAML object`);
    return null;
  }

  for (const key of Object.keys(result)) {
    if (!allowedFrontmatterKeys.has(key)) {
      failures.push(`${skillName}: unsupported frontmatter key "${key}"`);
    }
  }

  if (!result.name) {
    failures.push(`${skillName}: missing frontmatter name`);
  }

  if (!result.description) {
    failures.push(`${skillName}: missing frontmatter description`);
  }

  return result;
}

async function validateOpenAiYaml(skillName, file) {
  const text = await readFile(file, "utf8");
  let metadata;
  try {
    metadata = parse(text);
  } catch (error) {
    failures.push(`${skillName}: invalid agents/openai.yaml YAML: ${error.message}`);
    return;
  }

  const ui = metadata?.interface;
  if (!ui || typeof ui !== "object" || Array.isArray(ui)) {
    failures.push(`${skillName}: agents/openai.yaml missing interface object`);
    return;
  }

  if (!isNonEmptyString(ui.display_name)) {
    failures.push(`${skillName}: agents/openai.yaml missing interface.display_name`);
  }

  if (!isNonEmptyString(ui.short_description) || ui.short_description.length < 25 || ui.short_description.length > 64) {
    failures.push(`${skillName}: interface.short_description must be 25-64 characters`);
  }

  if (!isNonEmptyString(ui.default_prompt) || !ui.default_prompt.includes(`$${skillName}`)) {
    failures.push(`${skillName}: interface.default_prompt must mention $${skillName}`);
  }

  for (const key of ["icon_small", "icon_large"]) {
    const icon = ui[key];
    if (!icon) {
      continue;
    }

    if (!isNonEmptyString(icon)) {
      failures.push(`${skillName}: interface.${key} must be a string`);
      continue;
    }

    if (!icon.startsWith("./assets/")) {
      failures.push(`${skillName}: interface.${key} must point into ./assets/`);
    }

    const iconPath = path.resolve(path.dirname(file), "..", icon);
    if (!existsSync(iconPath)) {
      failures.push(`${skillName}: ${key} points to missing asset ${icon}`);
      continue;
    }

    await validateIconAsset(skillName, key, iconPath);
  }
}

async function validateIconAsset(skillName, key, file) {
  const ext = path.extname(file).toLowerCase();
  const asset = await readFile(file);

  if (asset.byteLength > maxIconBytes) {
    failures.push(`${skillName}: ${key} asset is too large (${asset.byteLength} bytes)`);
  }

  if (ext !== ".svg") {
    failures.push(`${skillName}: ${key} should point to an SVG asset`);
    return;
  }

  const text = asset.toString("utf8");
  if (!text.includes("<svg")) {
    failures.push(`${skillName}: ${key} asset is not valid SVG text`);
    return;
  }

  const viewBox = text.match(/\bviewBox=["'](?<viewBox>[^"']+)["']/);
  if (!viewBox?.groups?.viewBox) {
    failures.push(`${skillName}: ${key} SVG must include a viewBox`);
    return;
  }

  const values = viewBox.groups.viewBox.trim().split(/\s+/).map(Number);
  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) {
    failures.push(`${skillName}: ${key} SVG has an invalid viewBox`);
    return;
  }

  const [, , width, height] = values;
  if (width !== height) {
    failures.push(`${skillName}: ${key} SVG viewBox must be square`);
  }

  if (width < 32 || height < 32) {
    failures.push(`${skillName}: ${key} SVG viewBox must be at least 32x32`);
  }

  const svgTag = text.match(/<svg\b(?<attributes>[^>]*)>/);
  const dimensions = svgTag?.groups?.attributes.match(/\bwidth=["'](?<width>\d+(?:\.\d+)?)["'][\s\S]*\bheight=["'](?<height>\d+(?:\.\d+)?)["']/);
  if (dimensions?.groups) {
    const widthValue = Number(dimensions.groups.width);
    const heightValue = Number(dimensions.groups.height);
    if (widthValue !== heightValue) {
      failures.push(`${skillName}: ${key} SVG width and height must match`);
    }
  }
}

async function listSkillNames() {
  if (!existsSync(skillsRoot)) {
    failures.push("missing skills directory");
    return [];
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const names = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryStat = await stat(path.join(skillsRoot, entry.name));
    if (entryStat.isDirectory()) {
      names.push(entry.name);
    }
  }

  return names.sort();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
