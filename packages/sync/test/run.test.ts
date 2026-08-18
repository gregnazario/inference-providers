import { describe, expect, it } from "vitest"
import type { SdkCatalog } from "@ai-providers/sdk"
import { runSync, PROVIDER_ENV_KEYS } from "../src/run.js"
import { TARGETS } from "../src/adapters.js"

// --- fixture catalog builders (fully typed, self-contained — no dist/ needed) ---

const source = { url: "https://example.com/docs", verified: "2026-01-01" }

const offering = (wire_id: string, endpoint: string): SdkCatalog["providers"][number]["offerings"][number] => ({
  model: "lab/model",
  wire_id,
  endpoint,
  status: "ga",
  status_date: "2026-01-01",
  features: { streaming: true, tools: true, structured_output: true, prompt_caching: true, vision: true },
  reasoning: {
    style: "none",
    mandatory: false,
    default: "off",
    returns: "hidden",
    must_round_trip: "",
    incompatible_with: [],
    source,
  },
})

const provider = (
  id: string,
  offerings: { wire_id: string; endpoint?: string }[],
): SdkCatalog["providers"][number] => ({
  id,
  name: id,
  kind: "cloud_hosted",
  urls: { docs: "https://example.com/docs" },
  auth: [
    {
      id: "api-key",
      type: "api_key",
      transport: "header",
      header: "Authorization",
      env: [],
      extra_headers: {},
      getting_credentials: "console",
      docs: "https://example.com/docs",
    },
  ],
  endpoints: [{ id: "main", base_url: "https://api.example.com", path: "/v1", protocol: "openai-chat" }],
  api_surfaces: ["text", "streaming"],
  quirks: [],
  offerings: offerings.map((o) => offering(o.wire_id, o.endpoint ?? "main")),
})

const catalogOf = (...providers: SdkCatalog["providers"][number][]): SdkCatalog => ({ providers, models: [] })

// --- fixture fetch (no network) ---

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

const OPENAI_URL = "https://api.openai.com/v1/models"

/** All target ids except the given ones — the providers expected to be missing. */
const missingExcept = (...present: string[]) =>
  TARGETS.map((t) => t.providerId).filter((id) => !present.includes(id))

describe("PROVIDER_ENV_KEYS", () => {
  it("maps every target provider id to an env var", () => {
    for (const t of TARGETS) {
      expect(PROVIDER_ENV_KEYS[t.providerId], `env key for ${t.providerId}`).toMatch(/^[A-Z][A-Z0-9_]*_API_KEY$/)
    }
  })

  it("maps both opencode targets to the shared OPENCODE_API_KEY", () => {
    expect(PROVIDER_ENV_KEYS["opencode-zen"]).toBe("OPENCODE_API_KEY")
    expect(PROVIDER_ENV_KEYS["opencode-go"]).toBe("OPENCODE_API_KEY")
  })
})

describe("runSync", () => {
  it("reports drift for the credentialed provider and lists the rest as missing", async () => {
    const catalog = catalogOf(
      provider("openai", [{ wire_id: "gpt-5" }, { wire_id: "gpt-4" }]),
      provider("anthropic", [{ wire_id: "claude-sonnet-5" }]),
    )
    const result = await runSync({
      catalog,
      env: { OPENAI_API_KEY: "test-openai-key" },
      fetchImpl: async () => jsonResponse({ data: [{ id: "gpt-5" }, { id: "gpt-5.5" }] }),
    })

    expect(result.reports).toEqual([{ providerId: "openai", added: ["gpt-5.5"], removed: ["gpt-4"] }])
    expect(result.missingTargets).toEqual(missingExcept("openai"))
    expect(result.failed).toEqual([])
  })

  it("sends the env key as a Bearer Authorization header to the target url", async () => {
    let requestedUrl: string | undefined
    let authorization: string | undefined
    const catalog = catalogOf(provider("openai", [{ wire_id: "gpt-5" }]))
    await runSync({
      catalog,
      env: { OPENAI_API_KEY: "test-openai-key" },
      fetchImpl: async (input, init) => {
        requestedUrl = String(input)
        authorization = new Headers(init?.headers).get("Authorization") ?? undefined
        return jsonResponse({ data: [{ id: "gpt-5" }] })
      },
    })

    expect(requestedUrl).toBe(OPENAI_URL)
    expect(authorization).toBe("Bearer test-openai-key")
  })

  it("treats an empty env value as a missing target and never fetches", async () => {
    let fetches = 0
    const result = await runSync({
      catalog: catalogOf(provider("openai", [{ wire_id: "gpt-5" }])),
      env: { OPENAI_API_KEY: "" },
      fetchImpl: async () => {
        fetches += 1
        return jsonResponse({ data: [] })
      },
    })

    expect(result.missingTargets).toEqual(TARGETS.map((t) => t.providerId))
    expect(result.reports).toEqual([])
    expect(result.failed).toEqual([])
    expect(fetches).toBe(0)
  })

  it("omits the DriftReport when provider wire ids match exactly", async () => {
    const catalog = catalogOf(provider("openai", [{ wire_id: "gpt-5" }]))
    const result = await runSync({
      catalog,
      env: { OPENAI_API_KEY: "test-openai-key" },
      fetchImpl: async () => jsonResponse({ data: [{ id: "gpt-5" }] }),
    })

    expect(result.reports).toEqual([])
    expect(result.failed).toEqual([])
  })

  it("dedupes catalog wire ids offered under two endpoints", async () => {
    const catalog = catalogOf(
      provider("openai", [
        { wire_id: "gpt-5", endpoint: "chat" },
        { wire_id: "gpt-5", endpoint: "responses" },
      ]),
    )
    const result = await runSync({
      catalog,
      env: { OPENAI_API_KEY: "test-openai-key" },
      fetchImpl: async () => jsonResponse({ data: [{ id: "gpt-5" }, { id: "gpt-5.5" }] }),
    })

    expect(result.reports).toEqual([{ providerId: "openai", added: ["gpt-5.5"], removed: [] }])
  })

  it("reports every live id as added for a provider absent from the catalog", async () => {
    const result = await runSync({
      catalog: catalogOf(provider("openai", [{ wire_id: "gpt-5" }])),
      env: { OPENROUTER_API_KEY: "test-or-key" },
      fetchImpl: async () => jsonResponse({ data: [{ id: "anthropic/claude-sonnet-5" }] }),
    })

    expect(result.reports).toEqual([
      { providerId: "openrouter", added: ["anthropic/claude-sonnet-5"], removed: [] },
    ])
  })

  it("records a throwing fetch in failed without aborting the run", async () => {
    const catalog = catalogOf(
      provider("openai", [{ wire_id: "gpt-5" }]),
      provider("anthropic", [{ wire_id: "claude-sonnet-5" }]),
    )
    const result = await runSync({
      catalog,
      env: { OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k" },
      fetchImpl: async (input) => {
        if (String(input).includes("anthropic")) throw new Error("network down")
        return jsonResponse({ data: [{ id: "gpt-5" }] })
      },
    })

    expect(result.reports).toEqual([])
    expect(result.failed).toEqual([{ providerId: "anthropic", error: "network down" }])
    expect(result.missingTargets).toEqual(missingExcept("openai", "anthropic"))
  })

  it("records a non-2xx response in failed instead of diffing the error body", async () => {
    const catalog = catalogOf(provider("openai", [{ wire_id: "gpt-5" }]))
    const result = await runSync({
      catalog,
      env: { OPENAI_API_KEY: "k" },
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }),
    })

    expect(result.reports).toEqual([])
    expect(result.failed).toEqual([{ providerId: "openai", error: expect.stringContaining("401") }])
  })
})
