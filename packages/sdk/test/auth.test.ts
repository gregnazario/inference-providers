import { describe, expect, it } from "vitest"
import type { Provider } from "@ai-providers/schema"
import { authHeaders } from "../src/auth.js"

const anthropic: Provider = {
  id: "anthropic",
  name: "Anthropic",
  kind: "first_party",
  urls: {
    docs: "https://platform.claude.com/docs/en/api/overview",
    console: "https://console.anthropic.com",
  },
  auth: [
    {
      id: "api-key",
      type: "api_key",
      transport: "header",
      header: "x-api-key",
      env: ["ANTHROPIC_API_KEY"],
      key_prefix: "sk-ant-api",
      extra_headers: { "anthropic-version": "2023-06-01" },
      getting_credentials: "Console -> Settings -> API Keys.",
      docs: "https://platform.claude.com/docs/en/manage-claude/authentication",
    },
    {
      id: "oauth",
      type: "oauth",
      transport: "header",
      flow: "authorization_code_pkce",
      token_transport: "header",
      header: "x-api-key",
      env: [],
      extra_headers: { "anthropic-beta": "oauth-2025-04-20", "anthropic-version": "2023-06-01" },
      scopes: ["org:create_api_key", "user:inference"],
      getting_credentials: "Sign in with a Claude subscription.",
      docs: "https://code.claude.com/docs/en/authentication",
    },
  ],
  endpoints: [
    {
      id: "v1-messages",
      base_url: "https://api.anthropic.com",
      path: "/v1/messages",
      protocol: "anthropic-messages",
    },
  ],
  api_surfaces: ["text", "streaming", "batch", "count_tokens", "prompt_caching", "files"],
  quirks: [],
}

const openai: Provider = {
  id: "openai",
  name: "OpenAI",
  kind: "first_party",
  urls: { docs: "https://developers.openai.com/api/reference/overview/" },
  auth: [
    {
      id: "api-key",
      type: "api_key",
      transport: "header",
      header: "Authorization: Bearer",
      env: ["OPENAI_API_KEY"],
      key_prefix: "sk-",
      extra_headers: {},
      getting_credentials: "platform.openai.com -> API Keys.",
      docs: "https://developers.openai.com/api/reference/overview/",
    },
  ],
  endpoints: [
    {
      id: "v1-responses",
      base_url: "https://api.openai.com",
      path: "/v1/responses",
      protocol: "openai-responses",
    },
  ],
  api_surfaces: ["text", "streaming"],
  quirks: [],
}

const azure: Provider = {
  id: "azure-foundry",
  name: "Azure AI Foundry",
  kind: "cloud_hosted",
  urls: { docs: "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle" },
  auth: [
    {
      id: "api-key",
      type: "api_key",
      transport: "header",
      header: "api-key",
      env: ["AZURE_OPENAI_API_KEY"],
      extra_headers: {},
      getting_credentials: "Foundry resource -> Keys and Endpoint.",
      docs: "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle",
    },
    {
      id: "entra",
      type: "entra_bearer",
      transport: "header",
      header: "Authorization: Bearer",
      env: [],
      extra_headers: {},
      getting_credentials: "Microsoft Entra token.",
      docs: "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle",
    },
  ],
  endpoints: [
    {
      id: "v1-responses",
      base_url: "https://{resource}.openai.azure.com",
      path: "/openai/v1/responses",
      protocol: "openai-responses",
    },
  ],
  api_surfaces: ["text", "streaming"],
  quirks: [],
}

const bedrock: Provider = {
  id: "aws-bedrock",
  name: "AWS Bedrock",
  kind: "cloud_hosted",
  urls: { docs: "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html" },
  auth: [
    {
      id: "bearer-key",
      type: "api_key",
      transport: "header",
      header: "Authorization: Bearer",
      env: ["AWS_BEARER_TOKEN_BEDROCK"],
      extra_headers: {},
      getting_credentials: "Bedrock console -> API keys.",
      docs: "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html",
    },
    {
      id: "sigv4",
      type: "sigv4",
      transport: "request_signing",
      env: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"],
      extra_headers: {},
      getting_credentials: "Standard AWS credentials chain (IAM user, role, SSO).",
      docs: "https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam.html",
    },
  ],
  endpoints: [
    {
      id: "converse",
      base_url: "https://bedrock-runtime.{region}.amazonaws.com",
      path: "/model/{modelId}/converse",
      protocol: "bedrock-converse",
      auth: "sigv4",
    },
  ],
  api_surfaces: ["text", "streaming"],
  quirks: [],
}

const colliding: Provider = {
  ...anthropic,
  id: "colliding",
  auth: [
    {
      ...anthropic.auth[0]!,
      extra_headers: { "x-api-key": "stale-extra-value", "anthropic-version": "2023-06-01" },
    },
  ],
}

describe("authHeaders", () => {
  it("uses the first auth entry by default (anthropic x-api-key + anthropic-version)", () => {
    expect(authHeaders(anthropic, { credential: "sk-ant-api03-test" })).toEqual({
      "x-api-key": "sk-ant-api03-test",
      "anthropic-version": "2023-06-01",
    })
  })

  it("picks the auth entry matching authId (anthropic oauth adds its beta header)", () => {
    expect(authHeaders(anthropic, { credential: "oauth-token", authId: "oauth" })).toEqual({
      "x-api-key": "oauth-token",
      "anthropic-beta": "oauth-2025-04-20",
      "anthropic-version": "2023-06-01",
    })
  })

  it("renders Authorization: Bearer for openai", () => {
    expect(authHeaders(openai, { credential: "sk-test" })).toEqual({
      Authorization: "Bearer sk-test",
    })
  })

  it("uses the plain api-key header for azure", () => {
    expect(authHeaders(azure, { credential: "32charhexkey" })).toEqual({
      "api-key": "32charhexkey",
    })
    expect(authHeaders(azure, { credential: "entra-token", authId: "entra" })).toEqual({
      Authorization: "Bearer entra-token",
    })
  })

  it("throws for bedrock sigv4 request signing", () => {
    expect(() => authHeaders(bedrock, { credential: "AKIA-test", authId: "sigv4" })).toThrowError(
      "sigv4 requires request signing — not a header scheme",
    )
  })

  it("throws for an unknown authId", () => {
    expect(() => authHeaders(anthropic, { credential: "sk-ant-api03-test", authId: "nope" })).toThrowError(
      "auth method nope not found",
    )
  })

  it("lets the credential header win over a colliding extra header", () => {
    expect(authHeaders(colliding, { credential: "sk-ant-api03-test" })).toEqual({
      "x-api-key": "sk-ant-api03-test",
      "anthropic-version": "2023-06-01",
    })
  })
})
