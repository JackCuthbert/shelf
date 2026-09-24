import { describe, expect, it } from "vitest"
import { detectIconSlug } from "./homarr-icon"

describe("detectIconSlug", () => {
  it.each([
    [
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png",
      "home-assistant",
    ],
    [
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/plex.svg",
      "plex",
    ],
    [
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/dashdot.png",
      "dashdot",
    ],
    [
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/jellyfin.png?x=1",
      "jellyfin",
    ],
  ])("detects %s as %s", (url, slug) => {
    expect(detectIconSlug(url)).toBe(slug)
  })

  it.each([
    "https://example.com/icon.png",
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/Not_A_Slug.png",
    "",
  ])("returns null for %s", (url) => {
    expect(detectIconSlug(url)).toBeNull()
  })
})
