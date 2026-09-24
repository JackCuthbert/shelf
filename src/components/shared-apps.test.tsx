import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({})
  const useQuery = (_input: unknown, options?: { initialData: unknown }) => ({
    data: options?.initialData ?? [],
  })
  return {
    trpc: {
      useUtils: () => ({
        apps: { list: { invalidate: () => {} } },
        boards: { list: { invalidate: () => {} } },
      }),
      apps: {
        list: { useQuery },
        create: { useMutation },
        update: { useMutation },
        delete: { useMutation },
      },
      boards: {
        list: { useQuery },
        assign: { useMutation },
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
          iconSource: "dashboard",
          iconSlug: "plex",
          customIconUrl: null,
          iconHash: null,
          status: "unknown",
          lastError: null,
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

it("shows the last recorded state and failure reason without re-checking", () => {
  const html = renderToStaticMarkup(
    <SharedApps
      initialApps={[
        {
          id: "a1",
          name: "Proxmox",
          description: "",
          url: "https://pve.example",
          iconSource: "dashboard",
          iconSlug: "proxmox",
          customIconUrl: null,
          iconHash: null,
          status: "down",
          lastError: "Connection refused",
          lastCheckedAt: null,
          createdAt: "",
          updatedAt: "",
        },
      ]}
    />,
  )
  expect(html).toContain("Not responding")
  expect(html).toContain("Connection refused")
})

it("offers an add-to-board control on each app", () => {
  const html = renderToStaticMarkup(
    <SharedApps
      initialApps={[
        {
          id: "a1",
          name: "Plex",
          description: "",
          url: "https://plex.example",
          iconSource: "dashboard",
          iconSlug: "plex",
          customIconUrl: null,
          iconHash: null,
          status: "up",
          lastError: null,
          lastCheckedAt: null,
          createdAt: "",
          updatedAt: "",
        },
      ]}
    />,
  )
  expect(html).toContain("Add to board")
})
