import { describe, expect, it } from "vitest"
import { emitArtifacts } from "../src/emit.js"
import { buildCatalog } from "../src/join.js"
import { validateData } from "../src/validate.js"
import { loadRaw } from "../src/parse.js"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const fixtures = join(import.meta.dirname, "fixtures")

describe("emitArtifacts", () => {
  it("writes all artifacts with metadata", () => {
    const dir = mkdtempSync(join(tmpdir(), "emit-"))
    const c = buildCatalog(validateData(loadRaw(fixtures)))
    emitArtifacts(c, dir, { source_commit: "abc1234", generated_at: "2026-08-18T00:00:00Z" })
    for (const f of ["catalog.json", "providers.json", "models.json", "models/acme-test-model.json", "providers/acme.json"]) {
      expect(existsSync(join(dir, f)), f).toBe(true)
    }
    const catalog = JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8"))
    expect(catalog.generated_at).toBe("2026-08-18T00:00:00Z")
    expect(catalog.source_commit).toBe("abc1234")
    expect(catalog.providers[0].id).toBe("acme")
    expect(catalog.models[0].id).toBe("acme/test-model")
    expect(catalog.models[0].offered_via).toEqual([{ provider: "acme", wire_id: "test-model" }])
    rmSync(dir, { recursive: true, force: true })
  })
})
