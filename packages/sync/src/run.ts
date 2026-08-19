import type { SdkCatalog } from "@inference-providers/sdk"
import { TARGETS } from "./adapters.js"
import { diffWireIds, type DriftReport } from "./diff.js"

/**
 * providerId → env var holding its API key. Both opencode targets share
 * OPENCODE_API_KEY. Keyed targets whose env var is absent or empty are
 * skipped (recorded in `missingTargets`) — local dry-runs and first CI runs
 * have no secrets, and that is not an error. Targets marked `auth: "none"`
 * ignore this map entirely: they always run, credential-free.
 */
export const PROVIDER_ENV_KEYS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  xai: "XAI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  "opencode-zen": "OPENCODE_API_KEY",
  "opencode-go": "OPENCODE_API_KEY",
  minimax: "MINIMAX_API_KEY",
  "alibaba-dashscope": "DASHSCOPE_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  "ollama-cloud": "OLLAMA_API_KEY",
  baseten: "BASETEN_API_KEY",
  "fireworks-ai": "FIREWORKS_API_KEY",
  synthetic: "SYNTHETIC_API_KEY",
  "near-ai": "NEAR_AI_API_KEY",
  "io-intelligence": "IOINTELLIGENCE_API_KEY",
  hetzner: "HETZNER_API_KEY",
  meta: "MODEL_API_KEY",
  nvidia: "NVIDIA_API_KEY",
}

export type RunSyncOptions = {
  catalog: SdkCatalog
  /** Injectable fetch; tests pass a fixture so no request leaves the machine. */
  fetchImpl?: typeof fetch
  /** Provider API keys, keyed by env var name (defaults to nothing — the CLI passes process.env). */
  env?: Record<string, string | undefined>
}

export type SyncFailure = { providerId: string; error: string }

export type SyncRunResult = {
  reports: DriftReport[]
  missingTargets: string[]
  failed: SyncFailure[]
}

/** All catalog wire ids for a provider, collected across its endpoints. */
function catalogWireIds(catalog: SdkCatalog, providerId: string): string[] {
  const provider = catalog.providers.find((p) => p.id === providerId)
  return provider ? provider.offerings.map((o) => o.wire_id) : []
}

/**
 * Fetch every target's live model list and diff it against the catalog.
 * Keyless targets (`auth: "none"`) are always processed and fetched with no
 * Authorization header; keyed targets need their env var or they land in
 * `missingTargets`. Per-target failures (fetch, HTTP status, body parsing)
 * are recorded in `failed` — one bad provider never aborts the run.
 */
export async function runSync(opts: RunSyncOptions): Promise<SyncRunResult> {
  const { catalog, fetchImpl = fetch, env = {} } = opts
  const reports: DriftReport[] = []
  const missingTargets: string[] = []
  const failed: SyncFailure[] = []

  for (const target of TARGETS) {
    let headers: Record<string, string> | undefined
    if (target.auth !== "none") {
      const envKey = PROVIDER_ENV_KEYS[target.providerId]
      const apiKey = envKey !== undefined ? env[envKey] : undefined
      if (!apiKey) {
        missingTargets.push(target.providerId)
        continue
      }
      headers = { Authorization: `Bearer ${apiKey}` }
    }

    try {
      const res = await fetchImpl(target.url, headers === undefined ? undefined : { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${target.url}`)
      const liveWireIds = target.map(await res.json())
      const { added, removed } = diffWireIds(catalogWireIds(catalog, target.providerId), liveWireIds)
      if (added.length > 0 || removed.length > 0) {
        reports.push({ providerId: target.providerId, added, removed })
      }
    } catch (err) {
      failed.push({
        providerId: target.providerId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { reports, missingTargets, failed }
}
