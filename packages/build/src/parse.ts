import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { parse as parseToml } from "smol-toml"

export type RawDoc = { path: string; data: unknown }
export type RawOfferingDoc = RawDoc & { providerId: string }

const readToml = (path: string): unknown => parseToml(readFileSync(path, "utf8"))

const listToml = (dir: string): string[] => {
  try { return readdirSync(dir).filter((f) => f.endsWith(".toml")).sort() } catch { return [] }
}

export function loadRaw(dataDir: string) {
  const modelFiles: RawDoc[] = []
  const modelsDir = join(dataDir, "models")
  for (const lab of readdirSync(modelsDir).filter((d) => statSync(join(modelsDir, d)).isDirectory()).sort()) {
    for (const f of listToml(join(modelsDir, lab))) {
      modelFiles.push({ path: join("models", lab, f), data: readToml(join(modelsDir, lab, f)) })
    }
  }

  const providerFiles: RawDoc[] = []
  const offeringFiles: RawOfferingDoc[] = []
  const providersDir = join(dataDir, "providers")
  let providerDirs: string[] = []
  try {
    providerDirs = readdirSync(providersDir).filter((d) => statSync(join(providersDir, d)).isDirectory()).sort()
  } catch {
    providerDirs = []
  }
  for (const p of providerDirs) {
    const providerToml = join(providersDir, p, "provider.toml")
    providerFiles.push({ path: join("providers", p, "provider.toml"), data: readToml(providerToml) })
    for (const f of listToml(join(providersDir, p, "offerings"))) {
      offeringFiles.push({
        path: join("providers", p, "offerings", f),
        providerId: p,
        data: readToml(join(providersDir, p, "offerings", f)),
      })
    }
  }
  return { modelFiles, providerFiles, offeringFiles }
}
