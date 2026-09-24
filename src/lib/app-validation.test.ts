import { describe, expect, it } from "vitest"
import { appInputSchema } from "./app-validation"

describe("app input validation", () => {
  it("accepts private household HTTP URLs and explicit icon slugs", () => {
    expect(
      appInputSchema.parse({
        name: "Router",
        url: "http://192.168.1.1",
        iconSlug: "home-assistant",
      }),
    ).toEqual({
      name: "Router",
      url: "http://192.168.1.1/",
      iconSlug: "home-assistant",
    })
  })

  it.each(["javascript:alert(1)", "ftp://example.com", "not a url"])(
    "rejects unsupported URL %s",
    (url) => {
      expect(
        appInputSchema.safeParse({ name: "App", url, iconSlug: "app" }).success,
      ).toBe(false)
    },
  )

  it("rejects empty names and malformed icon slugs", () => {
    expect(
      appInputSchema.safeParse({
        name: "  ",
        url: "https://example.com",
        iconSlug: "valid",
      }).success,
    ).toBe(false)
    expect(
      appInputSchema.safeParse({
        name: "App",
        url: "https://example.com",
        iconSlug: "../secret",
      }).success,
    ).toBe(false)
  })
})
