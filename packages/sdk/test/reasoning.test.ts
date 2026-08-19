import { describe, expect, it } from "vitest"
import { buildReasoningParam, ReasoningParamError } from "../src/reasoning.js"
import type { EffortValue } from "../src/index.js"
import type { Offering, Reasoning } from "@inference-providers/schema"

/**
 * Minimal offering skeleton. Each reasoning block below is copied verbatim from
 * the seed data in data/providers/ (field-for-field, including notes omitted
 * where irrelevant to the wire shape) — fixtures are inline, not loaded from dist.
 */
function offering(model: string, wire_id: string, endpoint: string, reasoning: Reasoning): Offering {
  return {
    model,
    wire_id,
    endpoint,
    status: "ga",
    status_date: "",
    features: { streaming: true, tools: true, structured_output: true, prompt_caching: true, vision: true },
    reasoning,
  }
}

/** Run fn, assert it throws ReasoningParamError with the given code, return the error. */
function expectError(fn: () => unknown, code: ReasoningParamError["code"]): ReasoningParamError {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(ReasoningParamError)
    const err = e as ReasoningParamError
    expect(err.code).toBe(code)
    return err
  }
  throw new Error("expected function to throw ReasoningParamError")
}

// data/providers/openai/offerings/gpt-5-chat.toml
const openaiGpt5ChatOffering = offering("openai/gpt-5", "gpt-5", "v1-chat-completions", {
  style: "effort",
  mandatory: true,
  default: "on",
  returns: "hidden",
  must_round_trip: "",
  incompatible_with: [],
  effort: { param: "reasoning_effort", values: ["minimal", "low", "medium", "high"], default: "medium" },
  source: { url: "https://developers.openai.com/api/docs/guides/reasoning", verified: "2026-08-18" },
})

// data/providers/openai/offerings/gpt-5-responses.toml
const openaiGpt5ResponsesOffering = offering("openai/gpt-5", "gpt-5", "v1-responses", {
  style: "effort",
  mandatory: true,
  default: "on",
  returns: "hidden",
  must_round_trip: "encrypted_content",
  incompatible_with: ["temperature", "top_p"],
  effort: { param: "reasoning.effort", values: ["minimal", "low", "medium", "high"], default: "medium" },
  source: { url: "https://developers.openai.com/api/docs/guides/reasoning", verified: "2026-08-18" },
})

// data/providers/xai/offerings/grok-4-5-chat.toml
const grok45ChatOffering = offering("xai/grok-4-5", "grok-4.5", "v1-chat-completions", {
  style: "effort",
  mandatory: true,
  default: "on",
  returns: "reasoning_content",
  must_round_trip: "",
  incompatible_with: [],
  effort: { param: "reasoning_effort", values: ["low", "medium", "high"], default: "high" },
  source: { url: "https://docs.x.ai/docs/guides/reasoning", verified: "2026-08-18" },
})

// data/providers/xai/offerings/grok-4-6-chat.toml
const grok46ChatOffering = offering("xai/grok-4-6", "grok-4.6", "v1-chat-completions", {
  style: "effort",
  mandatory: true,
  default: "on",
  returns: "reasoning_content",
  must_round_trip: "",
  incompatible_with: [],
  effort: {
    param: "reasoning_effort",
    values: ["low", "medium", "high", "xhigh"],
    default: "high",
  },
  source: { url: "https://docs.x.ai/docs/guides/reasoning", verified: "2026-08-18" },
})

// data/providers/anthropic/offerings/claude-sonnet-4-5.toml
const claudeSonnetOffering = offering("anthropic/claude-sonnet-4-5", "claude-sonnet-4-5", "v1-messages", {
  style: "budget",
  mandatory: false,
  default: "on",
  returns: "thinking_blocks",
  must_round_trip: "signature",
  incompatible_with: ["temperature", "top_p", "top_k"],
  toggle: { param: "thinking.type", on: "enabled", off: "disabled" },
  budget: {
    param: "thinking.budget_tokens",
    min: 1024,
    max: 128000,
    zero_means_off: false,
    special_values: {},
    constraint: "must be < max_tokens",
  },
  source: {
    url: "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking",
    verified: "2026-08-18",
  },
})

// data/providers/google-gemini/offerings/gemini-2-5-pro.toml
const gemini25ProOffering = offering("google/gemini-2-5-pro", "gemini-2.5-pro", "generate-content", {
  style: "budget",
  mandatory: true,
  default: "on",
  returns: "thought_parts",
  must_round_trip: "thought_signature",
  incompatible_with: [],
  budget: {
    param: "generationConfig.thinkingConfig.thinkingBudget",
    min: 128,
    max: 32768,
    zero_means_off: false,
    special_values: { "-1": "dynamic" },
  },
  source: {
    url: "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking",
    verified: "2026-08-18",
  },
})

// data/providers/google-gemini/offerings/gemini-2-5-flash.toml
const gemini25FlashOffering = offering("google/gemini-2-5-flash", "gemini-2.5-flash", "generate-content", {
  style: "budget",
  mandatory: false,
  default: "on",
  returns: "thought_parts",
  must_round_trip: "thought_signature",
  incompatible_with: [],
  budget: {
    param: "generationConfig.thinkingConfig.thinkingBudget",
    min: 1,
    max: 24576,
    zero_means_off: true,
    special_values: { "-1": "dynamic" },
  },
  source: {
    url: "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking",
    verified: "2026-08-18",
  },
})

// data/providers/alibaba-dashscope/offerings/qwen3-max.toml
const qwen3MaxOffering = offering("alibaba/qwen3-max", "qwen3-max", "compatible-mode-chat", {
  style: "toggle",
  mandatory: false,
  default: "off",
  returns: "reasoning_content",
  must_round_trip: "reasoning_content",
  incompatible_with: [],
  toggle: { param: "enable_thinking", on: "true", off: "false" },
  source: {
    url: "https://www.alibabacloud.com/help/en/model-studio/deep-thinking",
    verified: "2026-08-18",
  },
})

// data/providers/minimax/offerings/minimax-m3.toml
const minimaxM3Offering = offering("minimax/minimax-m3", "MiniMax-M3", "chat-completions", {
  style: "toggle",
  mandatory: false,
  default: "adaptive",
  returns: "reasoning_content",
  must_round_trip: "reasoning_content",
  incompatible_with: [],
  toggle: { param: "thinking.type", on: "adaptive", off: "disabled" },
  source: {
    url: "https://platform.minimaxi.com/docs/api-reference/text-chat-openai",
    verified: "2026-08-18",
  },
})

// data/providers/openrouter/offerings/claude-sonnet-4-6.toml
const orClaudeOffering = offering(
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-sonnet-4.6",
  "chat-completions",
  {
    style: "effort",
    mandatory: false,
    default: "on",
    returns: "reasoning_content",
    must_round_trip: "reasoning_content",
    incompatible_with: [],
    effort: {
      param: "reasoning.effort",
      values: ["none", "minimal", "low", "medium", "high", "xhigh", "max"],
      default: "high",
    },
    budget: {
      param: "reasoning.max_tokens",
      min: 1024,
      max: 128000,
      zero_means_off: false,
      special_values: {},
    },
    source: {
      url: "https://openrouter.ai/docs/use-cases/reasoning-tokens",
      verified: "2026-08-18",
    },
  },
)

// data/providers/deepseek/offerings/deepseek-v4-pro-chat.toml
const dsV4ChatOffering = offering("deepseek/deepseek-v4-pro", "deepseek-v4-pro", "chat-completions", {
  style: "effort",
  mandatory: false,
  default: "on",
  returns: "reasoning_content",
  must_round_trip: "reasoning_content",
  incompatible_with: [],
  effort: { param: "reasoning_effort", values: ["low", "high", "max"], default: "high" },
  toggle: { param: "thinking.type", on: "enabled", off: "disabled" },
  source: {
    url: "https://api-docs.deepseek.com/guides/thinking_mode",
    verified: "2026-08-18",
  },
})

// data/providers/anthropic/offerings/claude-opus-4-6.toml
const claudeOpusOffering = offering("anthropic/claude-opus-4-6", "claude-opus-4-6", "v1-messages", {
  style: "adaptive",
  mandatory: false,
  default: "adaptive",
  returns: "thinking_blocks",
  must_round_trip: "signature",
  incompatible_with: [],
  source: {
    url: "https://platform.claude.com/docs/en/docs/build-with-claude/adaptive-thinking",
    verified: "2026-08-18",
  },
})

// No seeded style="none" offering exists; use the minimal inline shape (same as catalog.test.ts).
const noReasoningOffering = offering("acme/test-model", "test-model", "chat", {
  style: "none",
  mandatory: false,
  default: "off",
  returns: "hidden",
  must_round_trip: "",
  incompatible_with: [],
  source: { url: "https://acme.example.com/docs", verified: "2026-08-18" },
})

// Malicious param paths (not from seed data — these must never shape the wire fragment).
const protoToggleOffering = offering("acme/evil-toggle", "evil-toggle", "chat", {
  style: "toggle",
  mandatory: false,
  default: "off",
  returns: "hidden",
  must_round_trip: "",
  incompatible_with: [],
  toggle: { param: "__proto__.polluted", on: "true", off: "false" },
  source: { url: "https://acme.example.com/docs", verified: "2026-08-18" },
})

const constructorPathOffering = offering("acme/evil-effort", "evil-effort", "chat", {
  style: "effort",
  mandatory: false,
  default: "on",
  returns: "hidden",
  must_round_trip: "",
  incompatible_with: [],
  effort: { param: "constructor.prototype.x", values: ["low", "high"], default: "high" },
  source: { url: "https://acme.example.com/docs", verified: "2026-08-18" },
})

describe("buildReasoningParam — effort", () => {
  it("effort, chat protocol, top-level param", () => {
    expect(buildReasoningParam(openaiGpt5ChatOffering, { kind: "effort", effort: "high" })).toEqual({
      reasoning_effort: "high",
    })
  })

  it("effort, responses protocol, nested param", () => {
    expect(buildReasoningParam(openaiGpt5ResponsesOffering, { kind: "effort", effort: "high" })).toEqual({
      reasoning: { effort: "high" },
    })
  })

  it("xhigh on grok-4-5 (not in values) throws invalid_value", () => {
    expect(() => buildReasoningParam(grok45ChatOffering, { kind: "effort", effort: "xhigh" })).toThrow(
      ReasoningParamError,
    )
    expectError(() => buildReasoningParam(grok45ChatOffering, { kind: "effort", effort: "xhigh" }), "invalid_value")
  })

  it("effort on adaptive style without an effort block throws unsupported", () => {
    expectError(() => buildReasoningParam(claudeOpusOffering, { kind: "effort", effort: "high" }), "unsupported")
  })
})

describe("buildReasoningParam — budget", () => {
  it("budget below min throws out_of_range naming the bound", () => {
    expect(() => buildReasoningParam(claudeSonnetOffering, { kind: "budget", budget: 512 })).toThrow(/1024/)
    expectError(() => buildReasoningParam(claudeSonnetOffering, { kind: "budget", budget: 512 }), "out_of_range")
  })

  it("budget above max throws out_of_range naming the bound", () => {
    expect(() => buildReasoningParam(gemini25ProOffering, { kind: "budget", budget: 40000 })).toThrow(/32768/)
  })

  it("budget on anthropic", () => {
    expect(buildReasoningParam(claudeSonnetOffering, { kind: "budget", budget: 4096 })).toEqual({
      thinking: { budget_tokens: 4096 },
    })
  })

  it("budget on gemini dotted path", () => {
    expect(buildReasoningParam(gemini25ProOffering, { kind: "budget", budget: 8192 })).toEqual({
      generationConfig: { thinkingConfig: { thinkingBudget: 8192 } },
    })
  })

  it("special value -1 listed in special_values passes range validation", () => {
    expect(buildReasoningParam(gemini25ProOffering, { kind: "budget", budget: -1 })).toEqual({
      generationConfig: { thinkingConfig: { thinkingBudget: -1 } },
    })
  })

  it("openrouter effort with optional budget", () => {
    expect(buildReasoningParam(orClaudeOffering, { kind: "budget", budget: 2048 })).toEqual({
      reasoning: { max_tokens: 2048 },
    })
  })

  it("budget on a toggle-only style (no budget block) throws unsupported", () => {
    expectError(() => buildReasoningParam(qwen3MaxOffering, { kind: "budget", budget: 2048 }), "unsupported")
  })
})

describe("buildReasoningParam — enabled", () => {
  it("qwen boolean toggle coerces exactly-true on value", () => {
    expect(buildReasoningParam(qwen3MaxOffering, { kind: "enabled", enabled: true })).toEqual({
      enable_thinking: true,
    })
  })

  it("qwen boolean toggle coerces exactly-false off value", () => {
    expect(buildReasoningParam(qwen3MaxOffering, { kind: "enabled", enabled: false })).toEqual({
      enable_thinking: false,
    })
  })

  it("disable when mandatory throws mandatory", () => {
    expect(() => buildReasoningParam(grok46ChatOffering, { kind: "enabled", enabled: false })).toThrow(
      ReasoningParamError,
    )
    expectError(() => buildReasoningParam(grok46ChatOffering, { kind: "enabled", enabled: false }), "mandatory")
  })

  it("minimax adaptive toggle", () => {
    expect(buildReasoningParam(minimaxM3Offering, { kind: "enabled", enabled: true })).toEqual({
      thinking: { type: "adaptive" },
    })
  })

  it("gemini flash zero-off", () => {
    expect(buildReasoningParam(gemini25FlashOffering, { kind: "enabled", enabled: false })).toEqual({
      generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
    })
  })

  it("deepseek effort+toggle combo offering, disable via toggle", () => {
    expect(buildReasoningParam(dsV4ChatOffering, { kind: "enabled", enabled: false })).toEqual({
      thinking: { type: "disabled" },
    })
  })

  it("enable on adaptive style with no toggle emits nothing", () => {
    expect(buildReasoningParam(claudeOpusOffering, { kind: "enabled", enabled: true })).toEqual({})
  })
})

describe("buildReasoningParam — style none", () => {
  it("any request on style none throws unsupported", () => {
    expectError(() => buildReasoningParam(noReasoningOffering, { kind: "effort", effort: "high" }), "unsupported")
    expectError(() => buildReasoningParam(noReasoningOffering, { kind: "budget", budget: 4096 }), "unsupported")
    expectError(() => buildReasoningParam(noReasoningOffering, { kind: "enabled", enabled: true }), "unsupported")
    expectError(() => buildReasoningParam(noReasoningOffering, { kind: "enabled", enabled: false }), "unsupported")
  })
})

describe("buildReasoningParam — prototype pollution hardening", () => {
  it("rejects a __proto__ param path without touching Object.prototype", () => {
    const err = expectError(
      () => buildReasoningParam(protoToggleOffering, { kind: "enabled", enabled: true }),
      "unsupported",
    )
    expect(err.message).toContain('invalid param path "__proto__.polluted"')
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined()
  })

  it("rejects a constructor.prototype param path without touching Object.prototype", () => {
    const err = expectError(
      () => buildReasoningParam(constructorPathOffering, { kind: "effort", effort: "high" }),
      "unsupported",
    )
    expect(err.message).toContain('invalid param path "constructor.prototype.x"')
    expect((Object.prototype as Record<string, unknown>).x).toBeUndefined()
  })
})

describe("package entry exports", () => {
  it("EffortValue is exported from the package entry", () => {
    const effort: EffortValue = "xhigh"
    expect(["none", "minimal", "low", "medium", "high", "xhigh", "max"]).toContain(effort)
  })
})
