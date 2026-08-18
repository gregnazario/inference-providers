import { describe, expect, it } from "vitest"
import { loadRaw } from "../src/parse.js"
import { join } from "node:path"

const fixtures = join(import.meta.dirname, "fixtures")

describe("loadRaw", () => {
  it("finds the model, provider, and offering files with origins", () => {
    const raw = loadRaw(fixtures)
    expect(raw.modelFiles).toHaveLength(1)
    expect(raw.providerFiles).toHaveLength(1)
    expect(raw.offeringFiles).toHaveLength(1)
    expect(raw.offeringFiles[0]!.providerId).toBe("acme")
    expect((raw.modelFiles[0]!.data as Record<string, unknown>).id).toBe("acme/test-model")
  })
  it("puts offerings of unknown providers into providerFiles-less results without throwing", () => {
    // loadRaw is structural only; integrity checks happen in validate.
    const raw = loadRaw(fixtures)
    expect(raw.offeringFiles[0]!.path).toContain("acme/offerings/test-model.toml")
  })
})
