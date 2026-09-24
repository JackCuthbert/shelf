import { z } from "zod"

export const categoryTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a category title.")
  .max(80, "Category titles must be 80 characters or fewer.")

export const categoryInputSchema = z.object({
  title: categoryTitleSchema,
  description: z
    .string()
    .trim()
    .max(280, "Description must be 280 characters or fewer.")
    .default(""),
})

export const categoryIdInputSchema = z.object({ id: z.string().min(1) })

export type CategoryInput = z.infer<typeof categoryInputSchema>
