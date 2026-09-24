import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { UserMenu } from "./user-menu"

describe("UserMenu", () => {
  it("shows sign in for anonymous visitors", () => {
    const html = renderToStaticMarkup(<UserMenu user={null} />)
    expect(html).toContain('href="/"')
    expect(html).toContain("Sign in")
    expect(html).not.toContain('href="/account"')
  })

  it("shows the signed-in user's account and admin actions", () => {
    const html = renderToStaticMarkup(<UserMenu user={{ name: "Alex" }} />)
    expect(html).toContain("Alex")
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).not.toContain('class="btn text-xs"')
  })
})
