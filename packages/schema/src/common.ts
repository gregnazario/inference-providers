import { z } from "zod"

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")

export const SourceSchema = z.object({
  url: z.string().url(),
  verified: IsoDate,
})

/** nullish → normalized to null: omitted TOML key means unknown. */
const price = z.number().nonnegative().nullish().transform((v) => v ?? null)

export const CostSchema = z
  .object({
    input: price,
    output: price,
    cache_read: price,
    cache_write: price,
    free: z.boolean().default(false),
    notes: z.string().optional(),
    source: SourceSchema,
  })
  .refine((c) => (c.output === 0 || c.input === 0 || c.cache_read === 0 || c.cache_write === 0) ? c.free : true, {
    message: "a zero price requires free = true",
  })

export const LimitsSchema = z.object({
  context: z.number().int().positive(),
  output: z.number().int().positive().nullish().transform((v) => v ?? null),
  source: SourceSchema,
})

export const EFFORT_VOCAB = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const
export const EffortValue = z.enum(EFFORT_VOCAB)

export const ProviderKind = z.enum(["first_party", "cloud_hosted", "aggregator", "subscription"])
export const AuthType = z.enum([
  "api_key", "oauth", "oauth_device", "sigv4", "entra_bearer", "adc", "workload_federation",
])
export const Protocol = z.enum([
  "anthropic-messages", "openai-chat", "openai-responses", "google-generate-content", "bedrock-converse",
])
export const Surface = z.enum([
  "text", "streaming", "embeddings", "files", "batch", "count_tokens", "prompt_caching",
  "fine_tuning", "realtime", "image_gen", "audio", "rerank",
])
export const Status = z.enum(["ga", "preview", "deprecated", "retired"])
export const ReasoningStyle = z.enum(["none", "effort", "budget", "toggle", "adaptive", "always_on"])
export const Returns = z.enum(["thinking_blocks", "reasoning_content", "reasoning_summary", "thought_parts", "hidden"])
export const RoundTrip = z.enum(["signature", "thought_signature", "encrypted_content", "reasoning_content"])
export type Source = z.infer<typeof SourceSchema>
export type Cost = z.infer<typeof CostSchema>
export type Limits = z.infer<typeof LimitsSchema>
