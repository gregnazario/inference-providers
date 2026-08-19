import { describe, expect, it } from "vitest"
import { TARGETS, type SyncTarget } from "../src/adapters.js"

const target = (providerId: string): SyncTarget => {
  const t = TARGETS.find((t) => t.providerId === providerId)
  if (!t) throw new Error(`no target for provider "${providerId}"`)
  return t
}

/** The nineteen providers whose model-list endpoints are OpenAI-style `{ data: [{ id }] }`. */
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
  "baseten",
  "fireworks-ai",
  "synthetic",
  "near-ai",
  "io-intelligence",
  "hetzner",
  "meta",
  "nvidia",
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
      baseten: "https://inference.baseten.co/v1/models",
      "fireworks-ai": "https://api.fireworks.ai/inference/v1/models",
      synthetic: "https://api.synthetic.new/openai/v1/models",
      "near-ai": "https://cloud-api.near.ai/v1/models",
      "io-intelligence": "https://api.intelligence.io.solutions/api/v1/models",
      hetzner: "https://inference.hetzner.com/api/v1/models",
      meta: "https://api.meta.ai/v1/models",
      nvidia: "https://integrate.api.nvidia.com/v1/models",
    }
    for (const [providerId, url] of Object.entries(expected)) {
      expect(target(providerId).url, `url for ${providerId}`).toBe(url)
    }
    expect(TARGETS).toHaveLength(20)
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

  it("keeps nvidia's vendor-prefixed wire ids verbatim", () => {
    const body = { data: [{ id: "meta/muse-glimmer-30b" }, { id: "deepseek-ai/deepseek-v4-pro" }] }
    expect(target("nvidia").map(body)).toEqual(["meta/muse-glimmer-30b", "deepseek-ai/deepseek-v4-pro"])
  })

  it("keeps io-intelligence's org/model wire ids verbatim", () => {
    const body = { data: [{ id: "deepseek-ai/DeepSeek-V4-Pro" }, { id: "moonshotai/Kimi-K3" }] }
    expect(target("io-intelligence").map(body)).toEqual(["deepseek-ai/DeepSeek-V4-Pro", "moonshotai/Kimi-K3"])
  })

  it("keeps hetzner's HF-style wire ids verbatim", () => {
    const body = { data: [{ id: "Qwen/Qwen3.6-35B-A3B-FP8" }, { id: "Qwen/Qwen3.8-27B" }] }
    expect(target("hetzner").map(body)).toEqual(["Qwen/Qwen3.6-35B-A3B-FP8", "Qwen/Qwen3.8-27B"])
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
