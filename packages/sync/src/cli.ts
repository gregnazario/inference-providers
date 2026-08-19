import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { loadCatalog } from "@inference-providers/sdk"
import { runSync } from "./run.js"
import { TARGETS } from "./adapters.js"

// Throws when the catalog has not been emitted (run `pnpm emit` first) — the
// resulting non-zero exit is the correct signal, so there is no try/catch.
const catalog = loadCatalog()

const result = await runSync({ catalog, env: process.env })

const lines: string[] = []
if (result.missingTargets.length === TARGETS.length) {
  lines.push("no targets with credentials")
}
for (const report of result.reports) {
  lines.push(`## ${report.providerId}`)
  for (const id of report.added) lines.push(`- added: ${id}`)
  for (const id of report.removed) lines.push(`- removed: ${id}`)
}
console.log(lines.join("\n"))

for (const failure of result.failed) {
  console.error(`failed: ${failure.providerId} — ${failure.error}`)
}

const reportPath = join(import.meta.dirname, "../../../.superpowers/sync-report.json")
mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`)
console.error(`wrote ${reportPath}`)
