import { describe, expect, it } from "vitest"
import { ProviderSchema } from "../src/provider.js"

const valid = {
  id: "anthropic", name: "Anthropic", kind: "first_party",
  urls: { docs: "https://platform.claude.com/docs" },
  auth: [{
    id: "api-key", type: "api_key", transport: "header", header: "x-api-key",
    env: ["ANTHROPIC_API_KEY"], key_prefix: "sk-ant-api",
    extra_headers: { "anthropic-version": "2023-06-01" },
    getting_credentials: "Console → Settings → API Keys.",
    docs: "https://platform.claude.com/docs/en/manage-claude/authentication",
  }],
  endpoints: [{
    id: "v1-messages", base_url: "https://api.anthropic.com", path: "/v1/messages",
    protocol: "anthropic-messages",
  }],
  api_surfaces: ["text", "streaming", "batch", "count_tokens", "prompt_caching"],
}

describe("ProviderSchema", () => {
  it("accepts a valid provider", () => expect(ProviderSchema.safeParse(valid).success).toBe(true))
  it("requires text and streaming surfaces", () => {
    const bad = { ...valid, api_surfaces: ["text", "batch"] }
    expect(ProviderSchema.safeParse(bad).success).toBe(false)
  })
  it("rejects endpoint auth ref that does not exist", () => {
    const bad = { ...valid, endpoints: [{ ...valid.endpoints[0]!, auth: "nope" }] }
    expect(ProviderSchema.safeParse(bad).success).toBe(false)
  })
  it("rejects duplicate auth ids", () => {
    const bad = { ...valid, auth: [valid.auth[0]!, valid.auth[0]!] }
    expect(ProviderSchema.safeParse(bad).success).toBe(false)
  })
  it("accepts templated base URLs (cloud providers)", () => {
    const ok = {
      ...valid,
      endpoints: [{ ...valid.endpoints[0]!, base_url: "https://bedrock-runtime.{region}.amazonaws.com" }],
    }
    expect(ProviderSchema.safeParse(ok).success).toBe(true)
  })
  it("defaults quirks to []", () => {
    expect(ProviderSchema.parse(valid).quirks).toEqual([])
  })
})
