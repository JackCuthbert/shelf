import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({ isPending: false, mutate: () => {} })
  return {
    trpc: {
      useUtils: () => ({ apps: { list: { invalidate: () => {} } } }),
      apps: { create: { useMutation }, update: { useMutation } },
    },
  }
})
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
