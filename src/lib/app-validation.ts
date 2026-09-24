import { z } from "zod"

export const iconSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Choose a valid Dashboard Icons slug.")

function httpUrlSchema(schemeMessage: string) {
  return z
    .string()
    .trim()
    .url()
    .transform((value, context) => {
      let parsed: URL
      try {
        parsed = new URL(value)
      } catch {
        context.addIssue({
          code: "custom",
          message: "Enter a valid HTTP(S) URL.",
        })
        return z.NEVER
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        context.addIssue({ code: "custom", message: schemeMessage })
        return z.NEVER
      }
      return parsed.toString()
    })
}

const appUrlSchema = httpUrlSchema("App URLs must use HTTP or HTTPS.")
const imageUrlSchema = httpUrlSchema("Image URLs must use HTTP or HTTPS.")

const baseAppFields = {
  name: z.string().trim().min(1, "Enter an app name.").max(120),
  description: z
    .string()
    .trim()
    .max(280, "Description must be 280 characters or fewer.")
    .default(""),
  url: appUrlSchema,
}

export const appInputSchema = z.discriminatedUnion("iconSource", [
  z.object({
    ...baseAppFields,
    iconSource: z.literal("dashboard"),
    iconSlug: iconSlugSchema,
  }),
  z.object({
    ...baseAppFields,
    iconSource: z.literal("url"),
    iconUrl: imageUrlSchema,
  }),
])

const appIdField = { id: z.string().min(1) }

export const appUpdateInputSchema = z.discriminatedUnion("iconSource", [
  z.object({
    ...appIdField,
    ...baseAppFields,
    iconSource: z.literal("dashboard"),
    iconSlug: iconSlugSchema,
  }),
  z.object({
    ...appIdField,
    ...baseAppFields,
    iconSource: z.literal("url"),
    iconUrl: imageUrlSchema,
  }),
])

export const appIdInputSchema = z.object({ id: z.string().min(1) })

export type AppInput = z.infer<typeof appInputSchema>
