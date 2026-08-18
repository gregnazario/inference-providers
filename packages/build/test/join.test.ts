import { describe, expect, it } from "vitest"
import { buildCatalog } from "../src/join.js"
import { validateData } from "../src/validate.js"
import { loadRaw } from "../src/parse.js"
import { join } from "node:path"

const fixtures = join(import.meta.dirname, "fixtures")

describe("buildCatalog", () => {
  it("embeds offerings in providers and reverse-refs in models", () => {
    const c = buildCatalog(validateData(loadRaw(fixtures)))
    expect(c.providers[0]!.id).toBe("acme")
    expect(c.providers[0]!.offerings[0]!.wire_id).toBe("test-model")
    expect(c.models[0]!.offered_via).toEqual([{ provider: "acme", wire_id: "test-model" }])
  })
})
