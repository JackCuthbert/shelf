import { describe, expect, it } from "vitest"
import { appTitle, siteTitle } from "./page-title"

describe("page titles", () => {
  it("prefixes admin sections with the site name", () => {
    expect(appTitle("Boards")).toBe("Shelf · Boards")
    expect(appTitle("Apps")).toBe("Shelf · Apps")
    expect(appTitle("Account")).toBe("Shelf · Account")
  })

  it("suffixes a board name with the site name", () => {
    expect(siteTitle("Home")).toBe("Home · Shelf")
  })
})
