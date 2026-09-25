import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { USER_MENU_ITEMS, UserMenu } from "./user-menu"

describe("UserMenu", () => {
  it("shows sign in for anonymous visitors", () => {
    const html = renderToStaticMarkup(<UserMenu user={null} />)
    expect(html).toContain('href="/"')
    expect(html).toContain("Sign in")
    expect(html).not.toContain('href="/admin/account"')
  })

  it("shows the signed-in user's name and menu trigger", () => {
    const html = renderToStaticMarkup(<UserMenu user={{ name: "Alex" }} />)
    expect(html).toContain("Alex")
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).not.toContain('class="btn text-xs"')
    expect(html.match(/<svg/g)?.length ?? 0).toBeGreaterThanOrEqual(1)
  })

  it("lists Account and Manage, each with an icon", () => {
    expect(USER_MENU_ITEMS.map((item) => item.label)).toEqual([
      "Account",
      "Manage",
    ])
    expect(USER_MENU_ITEMS.map((item) => item.href)).toEqual([
      "/admin/account",
      "/admin/boards",
    ])
    for (const item of USER_MENU_ITEMS) {
      expect(typeof item.icon).toBe("function")
    }
  })
})
