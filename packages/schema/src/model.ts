import { z } from "zod"
import { IsoDate } from "./common.js"

const dateOrUnknown = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "ISO date or empty string for unknown")

/** Artificial Analysis Intelligence Index ranking for the model. */
export const RankingSchema = z.object({
  aa_index: z.number(),
  aa_variant: z.string().min(1),
  url: z.string().regex(/^https:\/\//, "must be an https URL"),
  verified: IsoDate,
})

export const ModelSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.-]*$/, "must be lab/model-slug"),
  name: z.string().min(1),
  family: z.string().min(1),
  lab: z.string().min(1),
  release_date: dateOrUnknown,
  retired_date: dateOrUnknown,
  knowledge_cutoff: dateOrUnknown,
  open_weights: z.boolean().optional(),
  hf_repo: z.string().optional(),
  license: z.string(),
  modalities: z.object({
    input: z.array(z.enum(["text", "image", "audio", "video"])).min(1),
    output: z.array(z.enum(["text", "image", "audio", "video"])).min(1),
  }),
  aliases: z.array(z.string()).default([]),
  description: z.string(),
  ranking: RankingSchema.optional(),
})

export type Model = z.infer<typeof ModelSchema>
