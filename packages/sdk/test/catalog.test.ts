import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { loadCatalog, ModelNotFoundError, resolveModel, type SdkCatalog } from "../src/catalog.js"

const catalog: SdkCatalog = {
  providers: [
    {
      id: "acme",
      name: "Acme",
      kind: "first_party",
      urls: { docs: "https://acme.example.com/docs" },
      auth: [
        {
          id: "api-key",
          type: "api_key",
          transport: "header",
          header: "Authorization: Bearer",
          env: [],
          extra_headers: {},
          getting_credentials: "Get a key at acme.example.com.",
          docs: "https://acme.example.com/docs/auth",
        },
      ],
      endpoints: [
        {
          id: "chat",
          base_url: "https://api.acme.example.com",
          path: "/v1/chat/completions",
          protocol: "openai-chat",
        },
      ],
      api_surfaces: ["text", "streaming"],
      quirks: [],
      offerings: [
        {
          model: "acme/test-model",
          wire_id: "test-model",
          endpoint: "chat",
          status: "ga",
          status_date: "",
          features: {
            streaming: true,
            tools: true,
            structured_output: true,
            prompt_caching: true,
            vision: true,
          },
          reasoning: {
            style: "none",
            mandatory: false,
            default: "off",
            returns: "hidden",
            must_round_trip: "",
            incompatible_with: [],
            source: { url: "https://acme.example.com/docs", verified: "2026-08-18" },
          },
        },
      ],
    },
  ],
  models: [
    {
      id: "acme/test-model",
      name: "Test Model",
      family: "test",
      lab: "acme",
      release_date: "2026-01-01",
      retired_date: "",
      knowledge_cutoff: "",
      open_weights: false,
      license: "",
      description: "Fixture model.",
      modalities: { input: ["text"], output: ["text"] },
      aliases: [],
      offered_via: [{ provider: "acme", wire_id: "test-model", endpoint: "chat" }],
    },
  ],
}

describe("resolveModel", () => {
  it("returns the model, offering, and provider triple", () => {
    const { model, offering, provider } = resolveModel(catalog, "acme", "test-model")
    expect(model).toBe(catalog.models[0])
    expect(offering).toBe(catalog.providers[0]!.offerings[0])
    expect(provider).toBe(catalog.providers[0])
    expect(model.offered_via).toEqual([{ provider: "acme", wire_id: "test-model", endpoint: "chat" }])
    expect(offering.endpoint).toBe("chat")
  })

  it("throws ModelNotFoundError for an unknown wire id", () => {
    let err: unknown
    try {
      resolveModel(catalog, "acme", "no-such-wire-id")
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ModelNotFoundError)
    const nf = err as ModelNotFoundError
    expect(nf.providerId).toBe("acme")
    expect(nf.wireId).toBe("no-such-wire-id")
  })

  it("throws ModelNotFoundError for an unknown provider id", () => {
    let err: unknown
    try {
      resolveModel(catalog, "ghost", "test-model")
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ModelNotFoundError)
    const nf = err as ModelNotFoundError
    expect(nf.providerId).toBe("ghost")
    expect(nf.wireId).toBe("test-model")
  })
})

describe("loadCatalog", () => {
  it("throws a not-found error for a bogus path", () => {
    const bogus = join(tmpdir(), "ai-providers-sdk-no-such", "catalog.json")
    expect(() => loadCatalog(bogus)).toThrowError("catalog not found — run pnpm emit")
  })
})
