import { describe, expect, it } from "vitest"
import { ModelSchema } from "../src/model.js"

const valid = {
  id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", family: "claude", lab: "anthropic",
  release_date: "2025-09-29", retired_date: "", knowledge_cutoff: "2025-07-31",
  open_weights: false, hf_repo: "", license: "",
  modalities: { input: ["text", "image"], output: ["text"] },
  description: "Flagship Claude model.",
}

describe("ModelSchema", () => {
  it("accepts a valid model", () => expect(ModelSchema.safeParse(valid).success).toBe(true))
  it("accepts unknown dates as empty strings", () => {
    expect(ModelSchema.safeParse({ ...valid, release_date: "", knowledge_cutoff: "" }).success).toBe(true)
  })
  it("rejects non-qualified id", () => {
    expect(ModelSchema.safeParse({ ...valid, id: "claude-sonnet-4-6" }).success).toBe(false)
  })
  it("rejects bad modality value", () => {
    expect(ModelSchema.safeParse({ ...valid, modalities: { input: ["vibes"], output: ["text"] } }).success).toBe(false)
  })
  it("defaults aliases to []", () => {
    const r = ModelSchema.parse(valid)
    expect(r.aliases).toEqual([])
  })
})
