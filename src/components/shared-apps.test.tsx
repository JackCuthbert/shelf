import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

const trpcMocks = vi.hoisted(() => ({
  recheckOptions: null as null | {
    onSuccess: (result: unknown, variables: { id: string }) => void
    onError: (cause: Error, variables: { id: string }) => void
  },
  recheckMutate: vi.fn(),
  invalidateApps: vi.fn(),
  pending: false,
}))

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({})
  const useRecheckMutation = (options: typeof trpcMocks.recheckOptions) => {
    trpcMocks.recheckOptions = options
    return { mutate: trpcMocks.recheckMutate, isPending: trpcMocks.pending }
  }
  const useQuery = (_input: unknown, options?: { initialData: unknown }) => ({
    data: options?.initialData ?? [],
  })
  return {
    trpc: {
      useUtils: () => ({
        apps: { list: { invalidate: trpcMocks.invalidateApps } },
        boards: { list: { invalidate: () => {} } },
      }),
      apps: {
        list: { useQuery },
        recheckStatus: { useMutation: useRecheckMutation },
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
          lastCheckedAt: "2026-09-24T00:00:00.000Z",
          createdAt: "",
          updatedAt: "",
        },
      ]}
    />,
  )
  expect(html).toContain("Not responding")
  expect(html).toContain("Connection refused")
  expect(html).toContain('aria-label="Actions for Proxmox"')
  expect(html).toContain("last checked")
  expect(html).toContain("2026-09-24T00:00:00.000Z UTC")
})

it("renders a compact responsive row with status on the icon and a menu trigger", () => {
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
          lastCheckedAt: "2026-09-24T00:00:00.000Z",
          createdAt: "",
          updatedAt: "",
        },
      ]}
    />,
  )
  expect(html).toContain('aria-label="Actions for Plex"')
  expect(html).toContain("panel flex min-w-0 items-center gap-3 p-3")
  expect(html).toContain("text-xs text-muted underline")
  expect(html).toContain("absolute -right-0.5 -top-0.5")
  expect(html).toContain("Responding")
})

it("wires Check now to the app mutation and invalidates the app list on success", () => {
  renderToStaticMarkup(
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
  expect(trpcMocks.recheckOptions).toBeTruthy()
  trpcMocks.recheckOptions?.onSuccess({}, { id: "a1" })
  expect(trpcMocks.invalidateApps).toHaveBeenCalledOnce()
})

it("configures a row-scoped request error handler", () => {
  renderToStaticMarkup(
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
          status: "unknown",
          lastError: null,
          lastCheckedAt: null,
          createdAt: "",
          updatedAt: "",
        },
      ]}
    />,
  )
  expect(trpcMocks.recheckOptions?.onError).toBeTypeOf("function")
})

it("shows an accessible per-app menu trigger for app actions", () => {
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
  expect(html).toContain('aria-label="Actions for Plex"')
})
