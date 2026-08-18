import { z } from "zod"
import { EffortValue, Returns, SourceSchema } from "./common.js"

const effortBlock = z.object({
  param: z.string().min(1),
  values: z.array(EffortValue).min(1),
  default: EffortValue,
  notes: z.string().optional(),
})

const budgetBlock = z
  .object({
    param: z.string().min(1),
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
    zero_means_off: z.boolean(),
    special_values: z.record(z.string(), z.string()).default({}),
    constraint: z.string().optional(),
  })
  .refine((b) => b.min === undefined || b.max === undefined || b.min < b.max, {
    message: "budget min must be < max",
  })

const toggleBlock = z.object({
  param: z.string().min(1),
  on: z.string().min(1),
  off: z.string(),
})

const base = {
  mandatory: z.boolean(),
  default: z.enum(["on", "off", "adaptive"]),
  notes: z.string().optional(),
  returns: Returns,
  must_round_trip: z.enum(["signature", "thought_signature", "encrypted_content", "reasoning_content", ""]),
  incompatible_with: z.array(z.string()).default([]),
  source: SourceSchema,
}

export const ReasoningSchema = z.discriminatedUnion("style", [
  z.object({ style: z.literal("none"), ...base }).strict(),
  z.object({ style: z.literal("effort"), ...base, effort: effortBlock, budget: budgetBlock.optional() }).strict(),
  z.object({ style: z.literal("budget"), ...base, budget: budgetBlock, toggle: toggleBlock.optional() })
    .strict()
    .refine((r) => !("effort" in r), { message: "effort block not allowed on budget style" }),
  z.object({ style: z.literal("toggle"), ...base, toggle: toggleBlock }).strict(),
  z.object({ style: z.literal("adaptive"), ...base, effort: effortBlock.optional() }).strict(),
  z.object({ style: z.literal("always_on"), ...base }).strict()
    .refine((r) => !("effort" in r) && !("budget" in r) && !("toggle" in r), {
      message: "always_on takes no control blocks",
    }),
]).superRefine((r, ctx) => {
  if (r.style === "effort" && !r.effort.values.includes(r.effort.default)) {
    ctx.addIssue({ code: "custom", message: "effort default must be one of values" })
  }
  if (r.style === "adaptive" && r.effort && !r.effort.values.includes(r.effort.default)) {
    ctx.addIssue({ code: "custom", message: "effort default must be one of values" })
  }
})

export type Reasoning = z.infer<typeof ReasoningSchema>
