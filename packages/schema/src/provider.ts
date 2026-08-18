import { z } from "zod"
import { AuthType, Protocol, ProviderKind, Surface } from "./common.js"

export const AuthSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: AuthType,
  transport: z.enum(["header", "query", "request_signing"]),
  header: z.string().optional(),
  env: z.array(z.string()).default([]),
  key_prefix: z.string().optional(),
  extra_headers: z.record(z.string(), z.string()).default({}),
  getting_credentials: z.string(),
  docs: z.string().url(),
  flow: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  token_transport: z.string().optional(),
})

export const EndpointSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  base_url: z.string().regex(/^https:\/\/[^\s]+$/, "https URL; {param} template slots allowed"),
  path: z.string().startsWith("/"),
  protocol: Protocol,
  auth: z.string().optional(),
})

export const PlanSchema = z.object({
  price_usd: z.number().nonnegative().nullish().transform((v) => v ?? null),
  period: z.string(),
  quota: z.string(),
  notes: z.string(),
  docs: z.string().url(),
})

export const ProviderSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    kind: ProviderKind,
    urls: z.object({
      docs: z.string().url(),
      console: z.string().url().optional(),
      status: z.string().url().optional(),
      pricing: z.string().url().optional(),
    }),
    auth: z.array(AuthSchema).min(1),
    endpoints: z.array(EndpointSchema).min(1),
    api_surfaces: z.array(Surface),
    quirks: z.array(z.object({ text: z.string(), docs: z.string().url() })).default([]),
    plan: PlanSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (!p.api_surfaces.includes("text") || !p.api_surfaces.includes("streaming")) {
      ctx.addIssue({ code: "custom", message: "api_surfaces must include text and streaming" })
    }
    const ids = p.auth.map((a) => a.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "auth ids must be unique" })
    }
    for (const e of p.endpoints) {
      if (e.auth && !ids.includes(e.auth)) {
        ctx.addIssue({ code: "custom", message: `endpoint ${e.id} references unknown auth "${e.auth}"` })
      }
    }
  })

export type Provider = z.infer<typeof ProviderSchema>
