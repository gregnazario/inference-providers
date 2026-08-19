import { describe, expect, it } from "vitest"
import { diffWireIds } from "../src/diff.js"

describe("diffWireIds", () => {
  it("reports live-only ids as added", () => {
    expect(diffWireIds(["a"], ["a", "b"])).toEqual({ added: ["b"], removed: [] })
  })

  it("reports catalog-only ids as removed", () => {
    expect(diffWireIds(["a", "b"], ["a"])).toEqual({ added: [], removed: ["b"] })
  })

  it("returns both lists empty for empty inputs", () => {
    expect(diffWireIds([], [])).toEqual({ added: [], removed: [] })
  })

  it("returns both lists empty when the sets match exactly", () => {
    expect(diffWireIds(["a", "b"], ["b", "a"])).toEqual({ added: [], removed: [] })
  })

  it("reports a rename as one added plus one removed", () => {
    expect(diffWireIds(["old-name"], ["new-name"])).toEqual({
      added: ["new-name"],
      removed: ["old-name"],
    })
  })

  it("sorts both output lists", () => {
    expect(diffWireIds(["zeta", "alpha"], ["mike", "bravo"])).toEqual({
      added: ["bravo", "mike"],
      removed: ["alpha", "zeta"],
    })
  })

  it("dedupes the catalog list (same wire id offered under two endpoints)", () => {
    // The catalog passes wire ids per offering; a provider may expose the same
    // wire id on two endpoints, so the catalog list can contain repeats.
    expect(diffWireIds(["x", "x"], ["x", "y"])).toEqual({ added: ["y"], removed: [] })
    expect(diffWireIds(["x", "x"], ["x"])).toEqual({ added: [], removed: [] })
  })

  it("dedupes the live list before diffing", () => {
    expect(diffWireIds(["x"], ["y", "y"])).toEqual({ added: ["y"], removed: ["x"] })
  })
})
