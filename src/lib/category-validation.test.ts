import { describe, expect, it } from "vitest"
import { categoryInputSchema } from "./category-validation"

describe("category input validation", () => {
  it("trims titles and defaults an absent description to empty", () => {
    expect(categoryInputSchema.parse({ title: "  Media  " })).toEqual({
      title: "Media",
      description: "",
    })
  })

  it("accepts a description up to 280 characters and trims it", () => {
    expect(
      categoryInputSchema.parse({
        title: "Media",
        description: ` ${"a".repeat(280)} `,
      }).description,
    ).toBe("a".repeat(280))
    expect(
      categoryInputSchema.safeParse({
        title: "Media",
        description: "a".repeat(281),
      }).success,
    ).toBe(false)
  })

  it("rejects empty and oversized titles", () => {
    expect(categoryInputSchema.safeParse({ title: "   " }).success).toBe(false)
    expect(
      categoryInputSchema.safeParse({ title: "a".repeat(81) }).success,
    ).toBe(false)
  })
})
