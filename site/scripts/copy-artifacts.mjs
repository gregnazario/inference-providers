// Copies the emitted JSON artifacts from the repo-root dist/ into the built
// site so they are downloadable at <base>artifacts/... alongside the HTML.
// Node builtins only — no workspace or node_modules dependencies.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
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
