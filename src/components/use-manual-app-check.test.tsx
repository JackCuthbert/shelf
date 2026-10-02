import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("@/components/use-page-visible", () => ({ usePageVisible: () => true }))
vi.mock("@/components/trpc-provider", () => ({
  trpc: {
    useUtils: () => ({ apps: { statuses: {}, list: {} } }),
    apps: { recheckStatus: { useMutation: () => ({}) } },
  },
}))

import { useManualAppCheck } from "./use-manual-app-check"

it("treats an initially checking snapshot as pending on first render", () => {
  let checking = false
  function Probe() {
    const checks = useManualAppCheck([
      {
        id: "app00001",
        status: "unknown",
        lastCheckedAt: null,
        lastError: null,
        checking: true,
        checkIntervalSeconds: 3600,
      },
    ])
    checking = checks.isChecking("app00001")
    return null
  }

  renderToStaticMarkup(<Probe />)
  expect(checking).toBe(true)
})
