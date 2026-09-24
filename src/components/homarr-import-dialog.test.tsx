import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({
    mutate: () => {},
    mutateAsync: async () => {},
    isPending: false,
    error: null,
  })
  return {
    trpc: {
      useUtils: () => ({ apps: { list: { invalidate: () => {} } } }),
      apps: { create: { useMutation } },
      imports: { previewHomarr: { useMutation } },
    },
  }
})

import { HomarrImportBody } from "./homarr-import-dialog"

describe("HomarrImportBody", () => {
  it("starts on the connection step", () => {
    const html = renderToStaticMarkup(<HomarrImportBody onClose={() => {}} />)
    expect(html).toContain('type="password"')
    expect(html).toContain("Connect")
  })
})
