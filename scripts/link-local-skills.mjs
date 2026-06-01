#!/usr/bin/env node
import { lstat, mkdir, readlink, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(repoRoot, "skills");
const links = [
  {
    label: "shared Agent Skills",
    directory: path.join(repoRoot, ".agents"),
    link: path.join(repoRoot, ".agents", "skills"),
    target: "../skills",
  },
  {
    label: "Claude project skills",
    directory: path.join(repoRoot, ".claude"),
    link: path.join(repoRoot, ".claude", "skills"),
    target: "../skills",
  },
];

if (!existsSync(skillsRoot)) {
  throw new Error(`Missing canonical skills directory: ${skillsRoot}`);
}

for (const link of links) {
  await mkdir(link.directory, { recursive: true });
  await ensureLink(link);
}

async function ensureLink(link) {
  const entry = await safeLstat(link.link);
  if (!entry) {
    await symlink(link.target, link.link, "dir");
    console.log(`Linked ${link.label}: ${path.relative(repoRoot, link.link)} -> ${link.target}`);
    return;
  }

  if (!entry.isSymbolicLink()) {
    throw new Error(`${path.relative(repoRoot, link.link)} already exists and is not a symlink`);
  }

  const currentTarget = await readlink(link.link);
  const resolvedTarget = path.resolve(path.dirname(link.link), currentTarget);
  if (resolvedTarget !== skillsRoot) {
    throw new Error(
      `${path.relative(repoRoot, link.link)} points to ${currentTarget}; expected ${link.target}`,
    );
  }

  console.log(`Linked ${link.label}: ${path.relative(repoRoot, link.link)} -> ${currentTarget}`);
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
