import { spawnSync } from "node:child_process";

const result = spawnSync("husky", {
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error?.code === "ENOENT") {
  process.exit(0);
}

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
