import { describe, expect, it } from "vitest"
import { appInputSchema } from "./app-validation"

describe("app input validation", () => {
  it("accepts private household HTTP URLs and explicit icon slugs", () => {
    expect(
      appInputSchema.parse({
        name: "Router",
        url: "http://192.168.1.1",
        iconSource: "dashboard",
        iconSlug: "home-assistant",
      }),
    ).toEqual({
      name: "Router",
      description: "",
      url: "http://192.168.1.1/",
      iconSource: "dashboard",
      iconSlug: "home-assistant",
    })
  })

  it("accepts a custom image URL as the icon source", () => {
    expect(
      appInputSchema.parse({
        name: "Router",
        url: "http://192.168.1.1",
        iconSource: "url",
        iconUrl: "https://images.home/router.png",
      }),
    ).toEqual({
      name: "Router",
      description: "",
      url: "http://192.168.1.1/",
      iconSource: "url",
      iconUrl: "https://images.home/router.png",
    })
  })

  it("accepts a description up to 280 characters and trims it", () => {
    expect(
      appInputSchema.parse({
        name: "App",
        description: ` ${"a".repeat(280)} `,
        url: "https://example.com",
        iconSource: "dashboard",
        iconSlug: "app",
      }).description,
    ).toBe("a".repeat(280))
    expect(
      appInputSchema.safeParse({
        name: "App",
        description: "a".repeat(281),
        url: "https://example.com",
        iconSource: "dashboard",
        iconSlug: "app",
      }).success,
    ).toBe(false)
  })

  it.each(["javascript:alert(1)", "ftp://example.com", "not a url"])(
    "rejects unsupported app URL %s",
    (url) => {
      expect(
        appInputSchema.safeParse({
          name: "App",
          url,
          iconSource: "dashboard",
          iconSlug: "app",
        }).success,
      ).toBe(false)
    },
  )

  it.each(["javascript:alert(1)", "ftp://example.com", "not a url"])(
    "rejects unsupported image URL %s",
    (iconUrl) => {
      expect(
        appInputSchema.safeParse({
          name: "App",
          url: "https://example.com",
          iconSource: "url",
          iconUrl,
        }).success,
      ).toBe(false)
    },
  )

  it("rejects empty names and malformed icon slugs", () => {
    expect(
      appInputSchema.safeParse({
        name: "  ",
        url: "https://example.com",
        iconSource: "dashboard",
        iconSlug: "valid",
      }).success,
    ).toBe(false)
    expect(
      appInputSchema.safeParse({
        name: "App",
        url: "https://example.com",
        iconSource: "dashboard",
        iconSlug: "../secret",
      }).success,
    ).toBe(false)
  })

  it("requires the field that matches the chosen icon source", () => {
    expect(
      appInputSchema.safeParse({
        name: "App",
        url: "https://example.com",
        iconSource: "dashboard",
      }).success,
    ).toBe(false)
    expect(
      appInputSchema.safeParse({
        name: "App",
        url: "https://example.com",
        iconSource: "url",
      }).success,
    ).toBe(false)
    expect(
      appInputSchema.safeParse({
        name: "App",
        url: "https://example.com",
      }).success,
    ).toBe(false)
  })
})
