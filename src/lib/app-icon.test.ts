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
