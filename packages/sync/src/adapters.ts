/**
 * Model-list sync adapters: one entry per provider whose model list can be
 * fetched from a public (auth-less or authed elsewhere) HTTP endpoint.
 * URLs were verified against provider docs in the 2026-08-18 and 2026-08-19
 * research passes.
 */
export type SyncTarget = {
  providerId: string
  url: string
  map: (body: unknown) => string[]
}

/** Extract `body.data[].id` — the envelope shared by OpenAI-style model lists. */
function mapDataIds(body: unknown): string[] {
  if (typeof body !== "object" || body === null) return []
  const data = (body as { data?: unknown }).data
  if (!Array.isArray(data)) return []
  return data.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return []
    const id = (entry as { id?: unknown }).id
    return typeof id === "string" ? [id] : []
  })
}

/** Extract `body.models[].name ?? .id` — MiniMax's proprietary envelope. */
function mapMinimax(body: unknown): string[] {
  if (typeof body !== "object" || body === null) return []
  const models = (body as { models?: unknown }).models
  if (!Array.isArray(models)) return []
  return models.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return []
    const { id, name } = entry as { id?: unknown; name?: unknown }
    if (typeof name === "string") return [name]
    if (typeof id === "string") return [id]
    return []
  })
}

export const TARGETS: SyncTarget[] = [
  { providerId: "openai", url: "https://api.openai.com/v1/models", map: mapDataIds },
  { providerId: "anthropic", url: "https://api.anthropic.com/v1/models", map: mapDataIds },
  { providerId: "xai", url: "https://api.x.ai/v1/models", map: mapDataIds },
  { providerId: "mistral", url: "https://api.mistral.ai/v1/models", map: mapDataIds },
  // DeepSeek serves the model list from the root path (`/v1/models` also works).
  { providerId: "deepseek", url: "https://api.deepseek.com/models", map: mapDataIds },
  { providerId: "openrouter", url: "https://openrouter.ai/api/v1/models", map: mapDataIds },
  { providerId: "opencode-zen", url: "https://opencode.ai/zen/v1/models", map: mapDataIds },
  { providerId: "opencode-go", url: "https://opencode.ai/zen/go/v1/models", map: mapDataIds },
  { providerId: "minimax", url: "https://api.minimax.io/v1/models", map: mapMinimax },
  {
    providerId: "alibaba-dashscope",
    url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
    map: mapDataIds,
  },
  { providerId: "moonshot", url: "https://api.moonshot.ai/v1/models", map: mapDataIds },
  { providerId: "ollama-cloud", url: "https://ollama.com/v1/models", map: mapDataIds },
  // Wave-3 providers — all serve OpenAI-style `{ data: [{ id }] }` model lists.
  { providerId: "baseten", url: "https://inference.baseten.co/v1/models", map: mapDataIds },
  { providerId: "fireworks-ai", url: "https://api.fireworks.ai/inference/v1/models", map: mapDataIds },
  { providerId: "synthetic", url: "https://api.synthetic.new/openai/v1/models", map: mapDataIds },
  { providerId: "near-ai", url: "https://cloud-api.near.ai/v1/models", map: mapDataIds },
  { providerId: "io-intelligence", url: "https://api.intelligence.io.solutions/api/v1/models", map: mapDataIds },
  { providerId: "hetzner", url: "https://inference.hetzner.com/api/v1/models", map: mapDataIds },
  { providerId: "meta", url: "https://api.meta.ai/v1/models", map: mapDataIds },
  { providerId: "nvidia", url: "https://integrate.api.nvidia.com/v1/models", map: mapDataIds },
]
