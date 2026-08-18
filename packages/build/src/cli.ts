import { execSync } from "node:child_process"
import { loadRaw } from "./parse.js"
import { validateData } from "./validate.js"
import { buildCatalog } from "./join.js"
import { emitArtifacts } from "./emit.js"
import { join } from "node:path"

const dataDir = join(import.meta.dirname, "../../../data")
const command = process.argv[2] ?? "validate"

const raw = loadRaw(dataDir)
const validated = validateData(raw)
for (const w of validated.warnings) console.warn(`WARN: ${w}`)

if (command === "validate") {
  console.log(`OK: ${validated.models.length} models, ${validated.providers.length} providers, ${validated.offerings.length} offerings`)
} else if (command === "emit") {
  const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()
  emitArtifacts(buildCatalog(validated), join(dataDir, "../dist"), {
    source_commit: sha,
    generated_at: new Date().toISOString(),
  })
  console.log(`Emitted artifacts to dist/ (commit ${sha})`)
} else {
  console.error(`unknown command "${command}" — use validate | emit`)
  process.exit(2)
}
