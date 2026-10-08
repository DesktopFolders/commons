#!/usr/bin/env node
// Fills in a site's Neon connection strings in commons/.env, through the Neon
// API, so nobody copies them from the console by hand.
//
// For site "cal" it finds the Neon project "commons-cal" and writes its direct
// (non-pooled) connection string to CAL_DATABASE_URL and
// CAL_DATABASE_DIRECT_URL, which Cal expects to be the same
// (support/cal/README.md). Values already set are left alone unless --force
// is given. The connection string is never printed.
//
// Needs NEON_API_KEY in commons/.env. An organization API key is best: it
// belongs to the organization rather than a person, so members can share it
// and it keeps working when someone leaves (support/neon/README.md). A
// personal key works too; when it reaches several organizations, set
// NEON_ORG_ID in commons/.env to pick one.
//
// Usage: node support/neon/neon-db.mjs <site> [--create] [--branch <name>]
//          [--region <id>] [--force]
//   --create   create the project (or the --branch) when it doesn't exist
//   --branch   use this branch instead of the default (production) one,
//              e.g. dev for local testing
//   --region   region for a new project (default aws-us-east-1, Virginia,
//              next to Vercel's default iad1 functions)
//   --force    replace connection strings already in commons/.env

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENV_FILE = join(ROOT, ".env");
const NEON_API = "https://console.neon.tech/api/v2";

function fail(message) {
  console.error(`Failed: ${message}`);
  process.exit(1);
}

// ---- arguments ------------------------------------------------------------

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return "";
  const value = args[i + 1];
  if (!value || value.startsWith("--")) fail(`${name} needs a value.`);
  args.splice(i, 2);
  return value;
};
const branchName = option("--branch");
const regionId = option("--region") || "aws-us-east-1";
const create = args.includes("--create");
const force = args.includes("--force");
const site = args.find((a) => !a.startsWith("--"));
if (!site || !/^[a-z][a-z0-9-]*$/.test(site)) {
  fail("give a site name, e.g. node support/neon/neon-db.mjs cal");
}
const PREFIX = site.toUpperCase().replace(/-/g, "_");
const PROJECT = `commons-${site}`;
const KEYS = [`${PREFIX}_DATABASE_URL`, `${PREFIX}_DATABASE_DIRECT_URL`];

// ---- commons/.env (read as shell by site-env, so values are quoted) --------

if (!existsSync(ENV_FILE)) fail("commons/.env not found. Create it from .env.example first.");

function readEnv(key) {
  const line = readFileSync(ENV_FILE, "utf8").split("\n").filter((l) => l.startsWith(`${key}=`)).pop();
  if (!line) return "";
  return line.slice(key.length + 1).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

// Replaces KEY=... in place, or appends it.
function saveEnv(key, value) {
  const text = readFileSync(ENV_FILE, "utf8");
  const lines = text.split("\n");
  const index = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (index >= 0) {
    lines[index] = `${key}="${value}"`;
    writeFileSync(ENV_FILE, lines.join("\n"));
  } else {
    const sep = text === "" || text.endsWith("\n") ? "" : "\n";
    writeFileSync(ENV_FILE, `${text}${sep}${key}="${value}"\n`);
  }
}

const apiKey = readEnv("NEON_API_KEY");
const orgId = readEnv("NEON_ORG_ID");
if (!apiKey) {
  fail("NEON_API_KEY is empty in commons/.env. Create an organization API key in the Neon console (support/neon/README.md) and paste it there as NEON_API_KEY=\"...\".");
}

// ---- Neon API -------------------------------------------------------------

async function neon(method, path, body) {
  const response = await fetch(`${NEON_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;
  if (response.status === 401) fail("Neon rejected NEON_API_KEY (401). Check the key in commons/.env, or create a new one.");
  if (/org_id/i.test(data.message || "")) await explainOrg();
  fail(`Neon API ${method} ${path}: ${response.status} ${data.message || ""}`.trim());
}

// A personal key reaching several organizations has to name one.
async function explainOrg() {
  const { organizations = [] } = await neon("GET", "/users/me/organizations");
  const list = organizations.map((o) => `  NEON_ORG_ID="${o.id}"  # ${o.name}`).join("\n");
  fail(`this personal key reaches several Neon organizations. Use an organization API key instead, or add one of these lines to commons/.env:\n${list}`);
}

const orgParam = orgId ? `&org_id=${encodeURIComponent(orgId)}` : "";

async function findProject() {
  const { projects = [] } = await neon("GET", `/projects?limit=400&search=${encodeURIComponent(PROJECT)}${orgParam}`);
  const project = projects.find((p) => p.name === PROJECT);
  if (project) {
    console.log(`  found project ${PROJECT} (${project.id}, ${project.region_id})`);
    return project.id;
  }
  if (!create) fail(`no Neon project named ${PROJECT} that this key can see. Add --create to create it in ${regionId}.`);
  const created = await neon("POST", "/projects", {
    project: { name: PROJECT, region_id: regionId, pg_version: 17, ...(orgId ? { org_id: orgId } : {}) },
  });
  console.log(`  created project ${PROJECT} (${created.project.id}, ${regionId})`);
  return created.project.id;
}

async function findBranch(projectId) {
  const { branches = [] } = await neon("GET", `/projects/${projectId}/branches`);
  const primary = branches.find((b) => b.default) || branches[0];
  if (!branchName) return primary;
  const branch = branches.find((b) => b.name === branchName);
  if (branch) return branch;
  if (!create) {
    fail(`no branch ${branchName} in ${PROJECT} (has: ${branches.map((b) => b.name).join(", ")}). Add --create to branch it from ${primary.name}.`);
  }
  const created = await neon("POST", `/projects/${projectId}/branches`, {
    branch: { name: branchName, parent_id: primary.id },
    endpoints: [{ type: "read_write" }],
  });
  console.log(`  created branch ${branchName} from ${primary.name}`);
  return created.branch;
}

// Direct connection string for the branch's database (neondb, or the first).
async function directUri(projectId, branch) {
  const { databases = [] } = await neon("GET", `/projects/${projectId}/branches/${branch.id}/databases`);
  const database = databases.find((d) => d.name === "neondb") || databases[0];
  if (!database) fail(`branch ${branch.name} has no database.`);
  const params = new URLSearchParams({
    branch_id: branch.id,
    database_name: database.name,
    role_name: database.owner_name,
    pooled: "false",
  });
  const { uri } = await neon("GET", `/projects/${projectId}/connection_uri?${params}`);
  return uri;
}

// ---- main -----------------------------------------------------------------

console.log(`Neon connection strings for ${site} (${KEYS.join(", ")})\n`);

const existing = KEYS.filter((k) => readEnv(k));
if (existing.length === KEYS.length && !force) {
  console.log(`  ${existing.join(" and ")} already set in commons/.env. Nothing to do (--force replaces them).`);
  process.exit(0);
}

const projectId = await findProject();
const branch = await findBranch(projectId);
const uri = await directUri(projectId, branch);

for (const key of KEYS) {
  if (readEnv(key) && !force) {
    console.log(`  kept  ${key} (already set; --force replaces it)`);
    continue;
  }
  saveEnv(key, uri);
  console.log(`  saved ${key}`);
}
console.log(`\n  branch ${branch.name}, host ${new URL(uri).hostname}`);
