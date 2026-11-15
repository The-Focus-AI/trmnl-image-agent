#!/usr/bin/env node
// skills 1.7.4 installs; this wrapper verifies before publishing its output.
// Hash format: upstream src/local-lock.ts at a80e4c9d12d607631249d4d7d059f835d4b2f13a.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, renameSync, rmSync, writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

export function readLock(path) {
  const lock = JSON.parse(readFileSync(path, "utf8"));
  if (lock.version !== 1 || !lock.skills || Array.isArray(lock.skills) || typeof lock.skills !== "object") {
    throw new Error("Expected a version 1 skills-lock.json with a skills object");
  }
  for (const [name, entry] of Object.entries(lock.skills)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || !entry ||
        entry.sourceType !== "github" || !/^[\w.-]+\/[\w.-]+$/.test(entry.source) ||
        entry.sourceUrl || !/^[0-9a-f]{40}$/.test(entry.ref) ||
        !/^[0-9a-f]{64}$/.test(entry.computedHash) || typeof entry.skillPath !== "string" ||
        entry.skillPath.split("/").at(-1) !== "SKILL.md" ||
        entry.skillPath.split("/").some((part) => !part || part === "." || part === ".." || part.includes("\\"))) {
      throw new Error(`${name}: require GitHub owner/repo, immutable commit ref, canonical skillPath and SHA-256 hash`);
    }
    if (entry.source === "cursor/plugins" && !entry.skillPath.startsWith("pstack/skills/")) {
      throw new Error(`${name}: expected canonical pstack/skills path, not a generated adapter`);
    }
  }
  return lock;
}

function folderHash(root) {
  const files = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink: ${path}`);
      if (entry.isDirectory()) {
        if (entry.name !== ".git" && entry.name !== "node_modules") visit(path);
      } else if (entry.isFile()) {
        files.push({ path, name: relative(root, path).replaceAll("\\", "/") });
      } else throw new Error(`Unexpected file type: ${path}`);
    }
  }
  visit(root);
  const hash = createHash("sha256");
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(file.name);
    hash.update(readFileSync(file.path));
  }
  return hash.digest("hex");
}

function verifyInstalled(dir, lock) {
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) throw new Error("Missing canonical skills directory");
  const expected = Object.keys(lock.skills).sort();
  if (!isDeepStrictEqual(readdirSync(dir).sort(), expected)) {
    throw new Error("Installed skill names differ from the lock (missing or unrecorded skills)");
  }
  for (const [name, entry] of Object.entries(lock.skills)) {
    const root = join(dir, name);
    if (!lstatSync(root).isDirectory()) throw new Error(`${name}: expected a real skill directory`);
    const text = readFileSync(join(root, "SKILL.md"), "utf8");
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const declared = frontmatter?.match(/^name:\s*["']?([a-z0-9-]+)["']?\s*$/m)?.[1];
    if (declared !== name) throw new Error(`${name}: missing or mismatched SKILL.md name`);
    if (folderHash(root) !== entry.computedHash) throw new Error(`${name}: installed content does not match recorded hash`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !["--check", "--validate-lock"].includes(args[0]))) {
    throw new Error("Usage: node scripts/restore-skills.mjs [--check | --validate-lock]");
  }
  const lockPath = join(process.cwd(), "skills-lock.json");
  const original = readFileSync(lockPath, "utf8");
  const lock = readLock(lockPath);
  const count = Object.keys(lock.skills).length;
  const agents = join(process.cwd(), ".agents");
  const installed = join(agents, "skills");
  if (args[0] === "--validate-lock") {
    console.log(`Validated ${count} immutable skill entries`);
    return;
  }
  if (args[0] === "--check") {
    verifyInstalled(installed, lock);
    console.log(`Verified ${count} installed skills against their recorded hashes`);
    return;
  }
  if (existsSync(agents) && !lstatSync(agents).isDirectory()) throw new Error(".agents must be a real directory");
  mkdirSync(agents, { recursive: true });
  const guard = join(agents, "skills-restore.lock");
  try { mkdirSync(guard); } catch {
    throw new Error("Another restore may be running; inspect .agents/skills-restore.lock before removing a stale guard");
  }
  let stage;
  let preserveRecovery = false;
  try {
    if (existsSync(installed)) {
      if (!lstatSync(installed).isDirectory()) throw new Error(".agents/skills must be a real directory");
      const extras = readdirSync(installed).filter((name) => !Object.hasOwn(lock.skills, name));
      if (extras.length) throw new Error(`Unrecorded installed skills; review before replacing: ${extras.join(", ")}`);
    }
    stage = mkdtempSync(join(agents, "restore-"));
    writeFileSync(join(stage, "skills-lock.json"), original);
    if (count) {
      const result = spawnSync("skills", ["experimental_install"], { cwd: stage, stdio: "inherit" });
      if (result.error || result.status !== 0) throw new Error("skills restore failed; current installation and lock are unchanged");
    } else mkdirSync(join(stage, ".agents", "skills"), { recursive: true });
    if (!isDeepStrictEqual(readLock(join(stage, "skills-lock.json")), lock)) {
      throw new Error("Restore changed the lock; review an explicit update instead (current lock unchanged)");
    }
    const candidate = join(stage, ".agents", "skills");
    verifyInstalled(candidate, lock);
    if (readFileSync(lockPath, "utf8") !== original) throw new Error("Project lock changed during restore; not publishing skills");
    const previous = join(stage, "previous");
    if (existsSync(installed)) renameSync(installed, previous);
    try { renameSync(candidate, installed); } catch (error) {
      if (existsSync(previous)) {
        try { renameSync(previous, installed); } catch {
          preserveRecovery = true;
          throw new Error(`Restore and rollback failed; preserved previous skills at ${previous}. Inspect before removing the restore guard.`);
        }
      }
      throw error;
    }
    console.log(`Restored and verified ${count} skills; project lock unchanged`);
  } finally {
    if (!preserveRecovery) {
      if (stage) rmSync(stage, { recursive: true, force: true });
      rmSync(guard, { recursive: true });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) {
    console.error(`Skill restore: ${error.message}`);
    process.exitCode = 1;
  }
}
