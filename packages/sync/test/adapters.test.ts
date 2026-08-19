import { describe, expect, it } from "vitest"
import { TARGETS, type SyncTarget } from "../src/adapters.js"

const target = (providerId: string): SyncTarget => {
  const t = TARGETS.find((t) => t.providerId === providerId)
  if (!t) throw new Error(`no target for provider "${providerId}"`)
  return t
}

/** The eleven providers whose model-list endpoints are OpenAI-style `{ data: [{ id }] }`. */
const DATA_STYLE_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "xai",
  "mistral",
  "deepseek",
  "openrouter",
  "opencode-zen",
  "opencode-go",
  "alibaba-dashscope",
  "moonshot",
  "ollama-cloud",
]

describe("TARGETS registry", () => {
  it("covers every researched model-list endpoint with its exact URL", () => {
    const expected: Record<string, string> = {
      openai: "https://api.openai.com/v1/models",
      anthropic: "https://api.anthropic.com/v1/models",
      xai: "https://api.x.ai/v1/models",
      mistral: "https://api.mistral.ai/v1/models",
      deepseek: "https://api.deepseek.com/models",
      openrouter: "https://openrouter.ai/api/v1/models",
      "opencode-zen": "https://opencode.ai/zen/v1/models",
      "opencode-go": "https://opencode.ai/zen/go/v1/models",
      minimax: "https://api.minimax.io/v1/models",
      "alibaba-dashscope": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
      moonshot: "https://api.moonshot.ai/v1/models",
      "ollama-cloud": "https://ollama.com/v1/models",
    }
    for (const [providerId, url] of Object.entries(expected)) {
      expect(target(providerId).url, `url for ${providerId}`).toBe(url)
    }
    expect(TARGETS).toHaveLength(12)
  })

  it("has unique provider ids", () => {
    const ids = TARGETS.map((t) => t.providerId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("maps each provider id to a sample model of its own", () => {
    for (const t of TARGETS) {
      const wireId = `${t.providerId}-model`
      // minimax uses the proprietary `models[].name` envelope; everyone else `data[].id`.
      const sample = t.providerId === "minimax" ? { models: [{ name: wireId }] } : { data: [{ id: wireId }] }
      expect(t.map(sample), `sample for ${t.providerId}`).toEqual([wireId])
    }
  })
})

describe("OpenAI-style data mapper", () => {
  it.each(DATA_STYLE_PROVIDER_IDS)("extracts every body.data[].id (%s)", (providerId) => {
    const body = { object: "list", data: [{ object: "model", id: "first-model" }, { object: "model", id: "second-model" }] }
    expect(target(providerId).map(body)).toEqual(["first-model", "second-model"])
  })

  it("keeps openrouter's vendor/model wire ids verbatim", () => {
    const body = { data: [{ id: "anthropic/claude-sonnet-4.5" }, { id: "openai/gpt-5.6" }] }
    expect(target("openrouter").map(body)).toEqual(["anthropic/claude-sonnet-4.5", "openai/gpt-5.6"])
  })

  it("keeps moonshot's dotted kimi wire ids verbatim", () => {
    const body = { data: [{ id: "kimi-k2.7-code" }, { id: "kimi-k3" }] }
    expect(target("moonshot").map(body)).toEqual(["kimi-k2.7-code", "kimi-k3"])
  })

  it("keeps ollama-cloud's org:model:cloud wire ids verbatim", () => {
    const body = { data: [{ id: "gpt-oss:120b-cloud" }, { id: "kimi-k3:cloud" }] }
    expect(target("ollama-cloud").map(body)).toEqual(["gpt-oss:120b-cloud", "kimi-k3:cloud"])
  })

  it("returns an empty list when the body is not a model-list object", () => {
    const t = target("openai")
    expect(t.map(null)).toEqual([])
    expect(t.map("list")).toEqual([])
    expect(t.map({})).toEqual([])
    expect(t.map({ data: "nope" })).toEqual([])
    expect(t.map({ data: [{ id: 123 }, null, { object: "model" }] })).toEqual([])
  })
})

describe("minimax mapper", () => {
  it("extracts body.models[].name, falling back to id", () => {
    const body = {
      models: [{ name: "MiniMax-M2.5", id: "abab-m2-5" }, { id: "MiniMax-M3" }],
    }
    expect(target("minimax").map(body)).toEqual(["MiniMax-M2.5", "MiniMax-M3"])
  })

  it("falls back to id when name is null", () => {
    const body = { models: [{ name: null, id: "abab-m2-5" }] }
    expect(target("minimax").map(body)).toEqual(["abab-m2-5"])
  })

  it("skips entries with neither a string name nor a string id", () => {
    const body = { models: [{ id: "keep-me" }, { name: 42, id: null }, {}, null] }
    expect(target("minimax").map(body)).toEqual(["keep-me"])
  })

  it("returns an empty list when the body is not a model-list object", () => {
    const t = target("minimax")
    expect(t.map(null)).toEqual([])
    expect(t.map({ data: [{ id: "wrong-envelope" }] })).toEqual([])
    expect(t.map({ models: { name: "not-an-array" } })).toEqual([])
  })
})
