import { describe, expect, it } from "vitest"
import { iconKey } from "./app-icon"

describe("iconKey", () => {
  it("returns the dashboard slug for a dashboard icon", () => {
    expect(
      iconKey({ iconSource: "dashboard", iconSlug: "plex", iconHash: null }),
    ).toBe("plex")
  })

  it("returns the hash for a custom image", () => {
    expect(
      iconKey({ iconSource: "url", iconSlug: null, iconHash: "abc123" }),
    ).toBe("abc123")
  })

  it("falls back to the placeholder when no icon is set", () => {
    expect(
      iconKey({ iconSource: "dashboard", iconSlug: null, iconHash: null }),
    ).toBe("placeholder")
  })
})

describe("iconKey dark mode", () => {
  const light = { iconSource: "dashboard", iconSlug: "plex", iconHash: null }

  it("falls back to the light key without a dark source", () => {
    expect(iconKey(light, "dark")).toBe("plex")
    expect(iconKey({ ...light, darkIconSource: null }, "dark")).toBe("plex")
  })

  it("uses the dark slug or hash and leaves light mode unchanged", () => {
    const dashboard = {
      ...light,
      darkIconSource: "dashboard",
      darkIconSlug: "plex-dark",
    }
    expect(iconKey(dashboard, "dark")).toBe("plex-dark")
    expect(iconKey(dashboard)).toBe("plex")
    const custom = { ...light, darkIconSource: "url", darkIconHash: "h1" }
    expect(iconKey(custom, "dark")).toBe("h1")
  })
})
