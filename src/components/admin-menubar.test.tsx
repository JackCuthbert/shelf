import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { AdminMenubar } from "./admin-menubar"

it("does not mark admin sections current on account settings", () => {
  const html = renderToStaticMarkup(
    <AdminMenubar active="account" user={{ name: "Alex" }} />,
  )
  expect(html).not.toContain('aria-current="page"')
  expect(html).toContain("Alex")
  expect(html).toMatch(
    /<a href="\/admin\/boards"[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>Boards<\/a>/,
  )
  expect(html).toMatch(
    /<a href="\/admin\/apps"[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>Apps<\/a>/,
  )
})
