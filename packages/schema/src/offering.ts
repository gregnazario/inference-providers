import { z } from "zod"
import { CostSchema, LimitsSchema, Status } from "./common.js"
import { ReasoningSchema } from "./reasoning.js"

export const FeaturesSchema = z.object({
  streaming: z.boolean().default(true),
  tools: z.boolean().default(true),
  structured_output: z.boolean().default(true),
  prompt_caching: z.boolean().default(true),
  vision: z.boolean().default(true),
})

export const OfferingSchema = z.object({
  model: z.string().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.-]*$/, "must be lab/model-slug"),
  wire_id: z.string().min(1),
  endpoint: z.string().min(1),
  status: Status,
  status_date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  cost: CostSchema.optional(),
  limits: LimitsSchema.optional(),
  features: FeaturesSchema.prefault({}),
  reasoning: ReasoningSchema,
})

export type Offering = z.infer<typeof OfferingSchema>
