import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Catalog } from "./join.js"

export function emitArtifacts(
  catalog: Catalog,
  outDir: string,
  meta: { source_commit: string; generated_at: string },
): void {
  mkdirSync(join(outDir, "providers"), { recursive: true })
  mkdirSync(join(outDir, "models"), { recursive: true })
  const providers = catalog.providers.map(({ offerings, ...p }) => p)
  const models = catalog.models.map(({ offered_via, ...m }) => m)
  writeFileSync(join(outDir, "catalog.json"), JSON.stringify({ ...meta, ...catalog }, null, 2))
  writeFileSync(join(outDir, "providers.json"), JSON.stringify({ ...meta, providers }, null, 2))
  writeFileSync(join(outDir, "models.json"), JSON.stringify({ ...meta, models }, null, 2))
  for (const p of catalog.providers) {
    writeFileSync(join(outDir, "providers", `${p.id}.json`), JSON.stringify({ ...meta, ...p }, null, 2))
  }
  for (const m of catalog.models) {
    writeFileSync(join(outDir, "models", `${m.id.replace("/", "-")}.json`), JSON.stringify({ ...meta, ...m }, null, 2))
  }
}
