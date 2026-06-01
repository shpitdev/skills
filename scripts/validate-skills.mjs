#!/usr/bin/env node
import { lstat, readdir, readFile, readlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(repoRoot, "skills");
const pluginsRoot = path.join(repoRoot, "plugins");
const marketplacePath = path.join(repoRoot, ".agents", "plugins", "marketplace.json");
const optionalInstallShims = [
  {
    label: ".agents/skills",
    root: path.join(repoRoot, ".agents", "skills"),
    target: skillsRoot,
  },
  {
    label: ".claude/skills",
    root: path.join(repoRoot, ".claude", "skills"),
    target: skillsRoot,
  },
];
const allowedFrontmatterKeys = new Set(["name", "description"]);
const allowedInstallPolicies = new Set(["NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"]);
const allowedAuthPolicies = new Set(["ON_INSTALL", "ON_USE"]);
const maxIconBytes = 256 * 1024;

const failures = [];
const validatedInstallShims = [];
const validatedPluginNames = [];

const skillNames = await listSkillNames(skillsRoot);
for (const skillName of skillNames) {
  await validateSkill(skillsRoot, skillName, skillName);
}

for (const shim of optionalInstallShims) {
  await validateInstallShim(shim, skillNames);
}

await validatePluginMarketplace();

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

const installShimSummary =
  validatedInstallShims.length > 0 ? ` and local install shims (${validatedInstallShims.join(", ")})` : "";
const pluginSummary = validatedPluginNames.length > 0 ? ` and plugins (${validatedPluginNames.join(", ")})` : "";
console.log(`Validated skills${installShimSummary}${pluginSummary}.`);

async function validateSkill(root, skillName, label) {
  const skillDir = path.join(root, skillName);
  const skillFile = path.join(skillDir, "SKILL.md");

  if (!existsSync(skillFile)) {
    failures.push(`${label}: missing SKILL.md`);
    return;
  }

  const markdown = await readFile(skillFile, "utf8");
  const frontmatter = parseFrontmatter(label, markdown);
  if (!frontmatter) {
    return;
  }

  if (frontmatter.name !== skillName) {
    failures.push(`${label}: frontmatter name must match directory name`);
  }

  if (!frontmatter.description || frontmatter.description.length < 40) {
    failures.push(`${label}: description must clearly explain when to use the skill`);
  }

  if (/Generated from|Do not edit/i.test(markdown)) {
    failures.push(`${label}: generated-skill marker found; skills must be hand-authored`);
  }

  const agentMetadata = path.join(skillDir, "agents", "openai.yaml");
  if (existsSync(agentMetadata)) {
    await validateOpenAiYaml(label, skillName, agentMetadata);
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

async function validateOpenAiYaml(label, skillName, file) {
  const text = await readFile(file, "utf8");
  let metadata;
  try {
    metadata = parse(text);
  } catch (error) {
    failures.push(`${label}: invalid agents/openai.yaml YAML: ${error.message}`);
    return;
  }

  const ui = metadata?.interface;
  if (!ui || typeof ui !== "object" || Array.isArray(ui)) {
    failures.push(`${label}: agents/openai.yaml missing interface object`);
    return;
  }

  if (!isNonEmptyString(ui.display_name)) {
    failures.push(`${label}: agents/openai.yaml missing interface.display_name`);
  }

  if (!isNonEmptyString(ui.short_description) || ui.short_description.length < 25 || ui.short_description.length > 64) {
    failures.push(`${label}: interface.short_description must be 25-64 characters`);
  }

  if (!isNonEmptyString(ui.default_prompt) || !ui.default_prompt.includes(`$${skillName}`)) {
    failures.push(`${label}: interface.default_prompt must mention $${skillName}`);
  }

  for (const key of ["icon_small", "icon_large"]) {
    const icon = ui[key];
    if (!icon) {
      continue;
    }

    if (!isNonEmptyString(icon)) {
      failures.push(`${label}: interface.${key} must be a string`);
      continue;
    }

    if (!icon.startsWith("./assets/")) {
      failures.push(`${label}: interface.${key} must point into ./assets/`);
    }

    const iconPath = path.resolve(path.dirname(file), "..", icon);
    if (!existsSync(iconPath)) {
      failures.push(`${label}: ${key} points to missing asset ${icon}`);
      continue;
    }

    await validateIconAsset(label, key, iconPath);
  }
}

async function validatePluginMarketplace() {
  if (!existsSync(marketplacePath)) {
    if (existsSync(pluginsRoot)) {
      failures.push("plugins: missing .agents/plugins/marketplace.json");
    }
    return;
  }

  const marketplace = await readJson(".agents/plugins/marketplace.json", marketplacePath);
  if (!marketplace) {
    return;
  }

  if (!isNonEmptyString(marketplace.name)) {
    failures.push(".agents/plugins/marketplace.json: missing marketplace name");
  }

  if (!isPlainObject(marketplace.interface) || !isNonEmptyString(marketplace.interface.displayName)) {
    failures.push(".agents/plugins/marketplace.json: missing interface.displayName");
  }

  if (!Array.isArray(marketplace.plugins)) {
    failures.push(".agents/plugins/marketplace.json: plugins must be an array");
    return;
  }

  const pluginNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `.agents/plugins/marketplace.json: plugins[${index}]`;
    if (!isPlainObject(entry)) {
      failures.push(`${label} must be an object`);
      continue;
    }

    if (!isPluginName(entry.name)) {
      failures.push(`${label}.name must be a lower-case plugin name`);
      continue;
    }

    if (pluginNames.has(entry.name)) {
      failures.push(`${label}.name duplicates ${entry.name}`);
    }
    pluginNames.add(entry.name);

    if (!isPlainObject(entry.source) || entry.source.source !== "local") {
      failures.push(`${label}.source must use source: "local"`);
    }

    const expectedSourcePath = `./plugins/${entry.name}`;
    if (entry.source?.path !== expectedSourcePath) {
      failures.push(`${label}.source.path must be ${expectedSourcePath}`);
    }

    if (!isPlainObject(entry.policy)) {
      failures.push(`${label}.policy must be an object`);
    } else {
      if (!allowedInstallPolicies.has(entry.policy.installation)) {
        failures.push(`${label}.policy.installation is invalid`);
      }

      if (!allowedAuthPolicies.has(entry.policy.authentication)) {
        failures.push(`${label}.policy.authentication is invalid`);
      }
    }

    if (!isNonEmptyString(entry.category)) {
      failures.push(`${label}.category must be a non-empty string`);
    }

    const pluginDir = path.join(repoRoot, "plugins", entry.name);
    if (!existsSync(pluginDir)) {
      failures.push(`${entry.name}: marketplace entry points to missing plugin directory`);
      continue;
    }

    await validatePlugin(entry.name, pluginDir);
  }
}

async function validatePlugin(pluginName, pluginDir) {
  const label = `plugin:${pluginName}`;
  const manifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  if (!existsSync(manifestPath)) {
    failures.push(`${label}: missing .codex-plugin/plugin.json`);
    return;
  }

  const manifest = await readJson(`${label}: .codex-plugin/plugin.json`, manifestPath);
  if (!manifest) {
    return;
  }

  if (manifest.name !== pluginName) {
    failures.push(`${label}: manifest name must match directory name`);
  }

  if (!isSemver(manifest.version)) {
    failures.push(`${label}: version must be semver`);
  }

  if (!isNonEmptyString(manifest.description) || manifest.description.length < 20) {
    failures.push(`${label}: description must describe the plugin`);
  }

  if (!isPlainObject(manifest.author) || !isNonEmptyString(manifest.author.name)) {
    failures.push(`${label}: author.name is required`);
  }

  await validatePluginPath(pluginDir, label, manifest.skills, "skills");
  await validatePluginPath(pluginDir, label, manifest.mcpServers, "mcpServers");

  if (manifest.skills) {
    await validatePluginSkills(pluginName, pluginDir, manifest.skills);
  }

  if (manifest.mcpServers) {
    await validatePluginMcp(pluginName, pluginDir, manifest.mcpServers);
  }

  await validatePluginInterface(pluginName, pluginDir, manifest.interface);
  validatedPluginNames.push(pluginName);
}

async function validatePluginPath(pluginDir, label, relativePath, fieldName) {
  if (!relativePath) {
    return;
  }

  if (!isNonEmptyString(relativePath) || path.isAbsolute(relativePath)) {
    failures.push(`${label}: ${fieldName} must be a relative string path`);
    return;
  }

  const resolved = path.resolve(pluginDir, relativePath);
  if (!resolved.startsWith(`${pluginDir}${path.sep}`) && resolved !== pluginDir) {
    failures.push(`${label}: ${fieldName} must stay inside the plugin directory`);
    return;
  }

  if (!existsSync(resolved)) {
    failures.push(`${label}: ${fieldName} points to missing path ${relativePath}`);
  }
}

async function validatePluginSkills(pluginName, pluginDir, relativePath) {
  const pluginSkillsRoot = path.resolve(pluginDir, relativePath);
  const bundledSkillNames = await listSkillNames(pluginSkillsRoot);
  if (bundledSkillNames.length === 0) {
    failures.push(`plugin:${pluginName}: skills directory must include at least one bundled skill`);
    return;
  }

  for (const skillName of bundledSkillNames) {
    const label = `plugin:${pluginName}/skills/${skillName}`;
    await validateSkill(pluginSkillsRoot, skillName, label);

    const canonicalSkillDir = path.join(skillsRoot, skillName);
    if (existsSync(canonicalSkillDir)) {
      await validateDirectoryMirror(
        label,
        canonicalSkillDir,
        path.join(pluginSkillsRoot, skillName),
        `plugin:${pluginName}: bundled skill ${skillName} differs from skills/${skillName}`,
      );
    }
  }
}

async function validatePluginMcp(pluginName, pluginDir, relativePath) {
  const mcpPath = path.resolve(pluginDir, relativePath);
  const mcpConfig = await readJson(`plugin:${pluginName}: ${relativePath}`, mcpPath);
  if (!mcpConfig) {
    return;
  }

  if (!isPlainObject(mcpConfig.mcpServers)) {
    failures.push(`plugin:${pluginName}: ${relativePath} must contain an mcpServers object`);
    return;
  }

  if (Object.keys(mcpConfig.mcpServers).length === 0) {
    failures.push(`plugin:${pluginName}: ${relativePath} must declare at least one MCP server`);
  }
}

async function validatePluginInterface(pluginName, pluginDir, ui) {
  const label = `plugin:${pluginName}: interface`;
  if (!isPlainObject(ui)) {
    failures.push(`${label} must be an object`);
    return;
  }

  for (const key of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
    if (!isNonEmptyString(ui[key])) {
      failures.push(`${label}.${key} is required`);
    }
  }

  if (!Array.isArray(ui.capabilities) || ui.capabilities.length === 0 || ui.capabilities.some((item) => !isNonEmptyString(item))) {
    failures.push(`${label}.capabilities must be a non-empty string array`);
  }

  if (
    !isNonEmptyString(ui.defaultPrompt) &&
    (!Array.isArray(ui.defaultPrompt) || ui.defaultPrompt.length === 0 || ui.defaultPrompt.some((item) => !isNonEmptyString(item)))
  ) {
    failures.push(`${label}.defaultPrompt must be a non-empty string or string array`);
  }

  if (ui.brandColor && !/^#[0-9a-fA-F]{6}$/.test(ui.brandColor)) {
    failures.push(`${label}.brandColor must be a 6-digit hex color`);
  }

  for (const key of ["composerIcon", "logo"]) {
    const icon = ui[key];
    if (!icon) {
      continue;
    }

    if (!isNonEmptyString(icon) || path.isAbsolute(icon)) {
      failures.push(`${label}.${key} must be a relative string path`);
      continue;
    }

    const iconPath = path.resolve(pluginDir, icon);
    if (!iconPath.startsWith(`${pluginDir}${path.sep}`)) {
      failures.push(`${label}.${key} must stay inside the plugin directory`);
      continue;
    }

    if (!existsSync(iconPath)) {
      failures.push(`${label}.${key} points to missing asset ${icon}`);
      continue;
    }

    await validateIconAsset(`plugin:${pluginName}`, key, iconPath);
  }
}

async function readJson(label, file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    failures.push(`${label}: invalid JSON: ${error.message}`);
    return null;
  }
}

async function validateDirectoryMirror(label, expectedRoot, actualRoot, mismatchMessage) {
  const expectedFiles = await listFilesRecursive(expectedRoot);
  const actualFiles = await listFilesRecursive(actualRoot);

  const missingFiles = expectedFiles.filter((file) => !actualFiles.includes(file));
  const extraFiles = actualFiles.filter((file) => !expectedFiles.includes(file));
  if (missingFiles.length > 0 || extraFiles.length > 0) {
    failures.push(`${mismatchMessage}; file list mismatch in ${label}`);
    return;
  }

  for (const file of expectedFiles) {
    const expected = await readFile(path.join(expectedRoot, file));
    const actual = await readFile(path.join(actualRoot, file));
    if (!expected.equals(actual)) {
      failures.push(`${mismatchMessage}; ${file} is out of sync`);
      return;
    }
  }
}

async function listFilesRecursive(root, prefix = "") {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function validateInstallShim(shim, canonicalSkillNames) {
  const entry = await safeLstat(shim.root);
  if (!entry) {
    return;
  }

  if (!entry.isSymbolicLink()) {
    failures.push(`${shim.label}: must be a symlink to skills/; run bun run link:local`);
    return;
  }

  const linkTarget = await readlink(shim.root);
  const resolvedTarget = path.resolve(path.dirname(shim.root), linkTarget);
  if (resolvedTarget !== shim.target) {
    failures.push(`${shim.label}: points to ${linkTarget}, expected ${path.relative(path.dirname(shim.root), shim.target)}`);
    return;
  }

  const shimSkillNames = await listSkillNames(shim.root);
  const missingSkillNames = canonicalSkillNames.filter((skillName) => !shimSkillNames.includes(skillName));
  if (missingSkillNames.length > 0) {
    failures.push(`${shim.label}: missing skill directories: ${missingSkillNames.join(", ")}`);
    return;
  }

  for (const skillName of canonicalSkillNames) {
    const skillFile = path.join(shim.root, skillName, "SKILL.md");
    if (!existsSync(skillFile)) {
      failures.push(`${shim.label}: ${skillName} is missing SKILL.md`);
    }
  }

  validatedInstallShims.push(shim.label);
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

async function listSkillNames(root) {
  if (!existsSync(root)) {
    failures.push(`missing skills directory: ${path.relative(repoRoot, root)}`);
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const names = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryStat = await stat(path.join(root, entry.name));
    if (entryStat.isDirectory()) {
      names.push(entry.name);
    }
  }

  return names.sort();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPluginName(value) {
  return typeof value === "string" && /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value);
}

function isSemver(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

async function safeLstat(file) {
  try {
    return await lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
