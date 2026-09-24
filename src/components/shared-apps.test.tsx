import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({})
  return {
    trpc: {
      useUtils: () => ({ apps: { list: { invalidate: () => {} } } }),
      apps: {
        list: {
          useQuery: (_input: unknown, options: { initialData: unknown }) => ({
            data: options.initialData,
          }),
        },
        create: { useMutation },
        update: { useMutation },
        delete: { useMutation },
      },
      imports: { previewHomarr: { useMutation } },
    },
  }
})

import { SharedApps } from "./shared-apps"

it("opens app creation from a modal trigger instead of an inline form", () => {
  const html = renderToStaticMarkup(<SharedApps initialApps={[]} />)
  expect(html).toContain("Create app")
  expect(html).toContain("Import from Homarr")
  expect(html).not.toContain("Add app")
  expect(html).not.toContain('placeholder="https://example.home"')
})

it("shows a filter and a single-column list when apps exist", () => {
  const html = renderToStaticMarkup(
    <SharedApps
      initialApps={[
        {
          id: "a1",
          name: "Plex",
          description: "Movies and shows",
          url: "https://plex.example",
          iconSlug: "plex",
          status: "unknown",
          lastCheckedAt: null,
          createdAt: "",
          updatedAt: "",
        },
      ]}
    />,
  )
  expect(html).toContain('id="app-filter"')
  expect(html).toContain("Plex")
  expect(html).toContain("Movies and shows")
  expect(html).not.toContain("sm:grid-cols-2")
  const icon = html.match(/<img[^>]*src="\/icons\/plex"[^>]*>/)?.[0]
  expect(icon).toBeDefined()
  expect(icon).not.toContain("border-line")
  expect(icon).not.toContain("bg-background")
})
