// Copies the emitted JSON artifacts from the repo-root dist/ into the built
// site so they are downloadable at <base>artifacts/... alongside the HTML.
// Also generates .well-known payloads whose contents depend on built files:
// the agent-skills index hashes the served SKILL.md at build time so the
// published digest can never drift from the served skill.
// Node builtins only — no workspace or node_modules dependencies.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { createHash } from "node:crypto"
import { join, resolve } from "node:path"

const sourceDir = resolve(import.meta.dirname, "../../dist")
const targetDir = resolve(import.meta.dirname, "../dist/artifacts")

// Sorted for deterministic output and copy order.
const topLevelFiles = ["catalog.json", "models.json", "providers.json"]
const perEntityDirs = ["models", "providers"]

function jsonFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
}

function fail(messages) {
  console.error(`copy-artifacts: aborting — ${messages[0]}`)
  for (const message of messages.slice(1)) {
    console.error(`copy-artifacts: ${message}`)
  }
  console.error(
    "copy-artifacts: run `pnpm emit` from the repository root, then rebuild the site.",
  )
  process.exit(1)
}

const missing = []
if (!existsSync(sourceDir)) {
  missing.push(`source directory not found: ${sourceDir}`)
}
for (const name of topLevelFiles) {
  const path = join(sourceDir, name)
  if (!existsSync(path)) {
    missing.push(`missing top-level artifact: ${path}`)
  }
}
for (const name of perEntityDirs) {
  const path = join(sourceDir, name)
  if (!existsSync(path)) {
    missing.push(`missing per-entity artifact directory: ${path}`)
  }
}
if (missing.length > 0) {
  fail(missing)
}

mkdirSync(targetDir, { recursive: true })

let count = 0
for (const name of topLevelFiles) {
  copyFileSync(join(sourceDir, name), join(targetDir, name))
  count += 1
}
for (const dir of perEntityDirs) {
  const from = join(sourceDir, dir)
  const to = join(targetDir, dir)
  mkdirSync(to, { recursive: true })
  for (const name of jsonFiles(from)) {
    copyFileSync(join(from, name), join(to, name))
    count += 1
  }
}

console.log(`copy-artifacts: copied ${count} files to ${targetDir}`)

// ---------- agent discovery (.well-known) ----------

const skillFile = resolve(import.meta.dirname, "../public/skills/catalog-skill/SKILL.md")
if (!existsSync(skillFile)) {
  fail([`agent skill file not found: ${skillFile}`])
}
const skillDigest = createHash("sha256").update(readFileSync(skillFile)).digest("hex")

const skillIndex = {
  $schema:
    "https://raw.githubusercontent.com/cloudflare/agent-skills-discovery-rfc/main/schema/index.schema.json",
  skills: [
    {
      name: "catalog-query",
      type: "text/markdown",
      description:
        "Query the inference-providers registry for model facts, per-provider offerings, pricing, and wire-level reasoning parameter shapes.",
      url: "https://gregnazario.github.io/inference-providers/skills/catalog-skill/SKILL.md",
      sha256: skillDigest,
    },
  ],
}

const wellKnownDir = resolve(import.meta.dirname, "../dist/.well-known")
mkdirSync(join(wellKnownDir, "agent-skills"), { recursive: true })
writeFileSync(
  join(wellKnownDir, "agent-skills", "index.json"),
  JSON.stringify(skillIndex, null, 2) + "\n",
)
console.log(`copy-artifacts: wrote .well-known/agent-skills/index.json (sha256 ${skillDigest.slice(0, 12)}…)`)
