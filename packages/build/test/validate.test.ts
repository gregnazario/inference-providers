import { describe, expect, it } from "vitest"
import { validateData } from "../src/validate.js"
import { loadRaw } from "../src/parse.js"
import { join } from "node:path"
import {
  copyFileSync,
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"

const fixtures = join(import.meta.dirname, "fixtures")

function withFixture(mutate: (dir: string) => void, fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "aip-"))
  cpSync(fixtures, dir, { recursive: true })
  mutate(dir)
  try { fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}

describe("validateData", () => {
  it("passes on the clean fixture", () => {
    const r = validateData(loadRaw(fixtures))
    expect(r.models).toHaveLength(1)
    expect(r.offerings).toHaveLength(1)
  })

  it("rejects offering referencing unknown model", () => {
    withFixture(
      (d) => {
        const p = join(d, "providers/acme/offerings/test-model.toml")
        const txt = readFileSync(p, "utf8").replace('model = "acme/test-model"', 'model = "acme/ghost"')
        writeFileSync(p, txt)
      },
      (d) => {
        expect(() => validateData(loadRaw(d))).toThrow(/unknown model "acme\/ghost"/)
      },
    )
  })

  it("rejects offering referencing unknown endpoint", () => {
    withFixture(
      (d) => {
        const p = join(d, "providers/acme/offerings/test-model.toml")
        const txt = readFileSync(p, "utf8").replace('endpoint = "chat"', 'endpoint = "ghost"')
        writeFileSync(p, txt)
      },
      (d) => expect(() => validateData(loadRaw(d))).toThrow(/unknown endpoint "ghost"/),
    )
  })

  it("fails provenance older than 180 days, warns after 90", () => {
    const old = "2025-08-01"   // >180d before 2026-08-18
    const mid = "2026-05-01"   // >90d, <180d
    withFixture(
      (d) => {
        const p = join(d, "providers/acme/offerings/test-model.toml")
        const txt = readFileSync(p, "utf8").replace('verified = "2026-08-18"', `verified = "${old}"`)
        writeFileSync(p, txt)
      },
      (d) => {
        expect(() => validateData(loadRaw(d), { today: "2026-08-18" })).toThrow(/stale provenance/)
        const r2 = (() => {
          const dir2 = mkdtempSync(join(tmpdir(), "aip-"))
          cpSync(fixtures, dir2, { recursive: true })
          const p2 = join(dir2, "providers/acme/offerings/test-model.toml")
          const t2 = readFileSync(p2, "utf8").replace('verified = "2026-08-18"', `verified = "${mid}"`)
          writeFileSync(p2, t2)
          try { return validateData(loadRaw(dir2), { today: "2026-08-18" }) } finally { rmSync(dir2, { recursive: true, force: true }) }
        })()
        expect(r2.warnings.some((w: string) => w.includes("90 days"))).toBe(true)
      },
    )
  })

  it("rejects duplicate wire_id within a provider", () => {
    withFixture(
      (d) => {
        const dir = join(d, "providers/acme/offerings")
        copyFileSync(join(dir, "test-model.toml"), join(dir, "test-model-copy.toml"))
      },
      (d) => expect(() => validateData(loadRaw(d))).toThrow(/duplicate wire_id/),
    )
  })
})
