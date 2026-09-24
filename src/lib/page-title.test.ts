import { describe, expect, it } from "vitest"
import { appTitle, siteTitle } from "./page-title"

describe("page titles", () => {
  it("prefixes admin sections with the site name", () => {
    expect(appTitle("Boards")).toBe("Hometime · Boards")
    expect(appTitle("Apps")).toBe("Hometime · Apps")
    expect(appTitle("Account")).toBe("Hometime · Account")
  })

  it("suffixes a board name with the site name", () => {
    expect(siteTitle("Home")).toBe("Home · Hometime")
  })
})
