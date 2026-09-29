import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/components/use-manual-app-check", () => ({
  useManualAppCheck: () => ({
    request: vi.fn(),
    isChecking: (id: string) => id === "app00001",
    snapshots: {},
    errors: {},
  }),
}))

import { AppDetailCheckAction } from "./app-detail-check-action"

it("keeps the detail action busy while work is pending", () => {
  const html = renderToStaticMarkup(
    <AppDetailCheckAction
      appId="app00001"
      appName="Plex"
      snapshot={{
        id: "app00001",
        status: "down",
        lastCheckedAt: 1,
        lastError: "Connection refused",
        checking: true,
      }}
    />,
  )
  expect(html).toContain('aria-label="Check Plex now"')
  expect(html).toContain("disabled")
  expect(html).toContain("animate-spin")
  expect(html).toContain("bg-danger")
  expect(html).toContain("motion-safe:animate-pulse")
})
