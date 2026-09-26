import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  BoardSearch,
  descriptionTileHandlers,
  statusColor,
} from "./board-search"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }))

vi.mock("@/components/trpc-provider", () => ({
  trpc: {
    useUtils: () => ({ boards: { list: { invalidate: async () => {} } } }),
    boards: {
      list: { useQuery: () => ({ data: [] }) },
      assign: { useMutation: () => ({ mutate: () => {} }) },
      refreshStatuses: {
        useMutation: () => ({ mutateAsync: async () => [] }),
      },
    },
    apps: {
      list: { useQuery: () => ({ data: [] }) },
      delete: {
        useMutation: () => ({ mutateAsync: async () => {}, isPending: false }),
      },
    },
  },
}))

const apps = [
  {
    id: "plex",
    ownerId: "user-1",
    name: "Plex",
    description: "Movies and shows",
    url: "https://plex.example",
    iconKey: "plex",
    iconSource: "dashboard",
    iconSlug: "plex",
    customIconUrl: null,
    categoryId: null,
    status: "up" as const,
    lastCheckedAt: Date.parse("2026-09-24T00:00:00Z"),
  },
  {
    id: "sonarr",
    ownerId: "user-2",
    name: "Sonarr",
    description: "",
    url: "https://sonarr.example",
    iconKey: "sonarr",
    iconSource: "dashboard",
    iconSlug: "sonarr",
    customIconUrl: null,
    categoryId: null,
    status: "unknown" as const,
    lastCheckedAt: null,
  },
]

describe("statusColor", () => {
  it("keeps the last known state colour while a check is in progress", () => {
    expect(statusColor("up", true)).toContain("bg-green-600")
    expect(statusColor("down", true)).toContain("bg-danger")
    expect(statusColor("unknown", true)).toContain("bg-muted")
    expect(statusColor("up", true)).toContain("animate-pulse")
  })

  it("stops pulsing and shows the settled state colour", () => {
    expect(statusColor("up", false)).not.toContain("animate-pulse")
    expect(statusColor("down", false)).toContain("bg-danger")
    expect(statusColor("unknown", false)).not.toContain("animate-pulse")
  })
})

describe("BoardSearch", () => {
  it("renders a sticky header with the board name, search field, and anonymous sign-in link", () => {
    const html = renderToStaticMarkup(
      <BoardSearch
        boardName="Home"
        boardNanoid="abcdefgh"
        apps={apps}
        categories={[]}
        user={null}
      />,
    )
    expect(html).toContain("sticky")
    expect(html).toContain("Home")
    expect(html).toContain('id="board-search"')
    expect(html).toContain('href="/login"')
    expect(html).toContain("Sign in")
  })

  it("renders each app as a new-tab tile in manual order", () => {
    const html = renderToStaticMarkup(
      <BoardSearch
        boardName="Home"
        boardNanoid="abcdefgh"
        apps={apps}
        categories={[]}
        user={null}
      />,
    )
    const hrefs = [...html.matchAll(/<a[^>]*href="(https:[^"]+)"[^>]*>/g)].map(
      (match) => match[1],
    )
    expect(hrefs).toEqual(["https://plex.example", "https://sonarr.example"])
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer"')
    expect(html).toContain('src="/icons/plex"')
    expect(html).toContain("Plex")
    expect(html).toContain("aspect-square")
    expect(html).toContain("min-[360px]:grid-cols-2")
    expect(html).toContain("sm:grid-cols-3")
    expect(html).toContain("md:grid-cols-4")
    expect(html).toContain("lg:grid-cols-5")
    expect(html).toContain("xl:grid-cols-6")
    expect(html).toContain("max-w-6xl")
    expect(html).toContain(
      'aria-label="Responding; last checked 2026-09-24T00:00:00.000Z"',
    )
    expect(html).toContain('aria-label="Status unknown; not checked yet"')
  })

  it("keeps the search field visible on an empty board", () => {
    const html = renderToStaticMarkup(
      <BoardSearch
        boardName="Empty"
        boardNanoid="abcdefgh"
        apps={[]}
        categories={[]}
        user={null}
      />,
    )
    expect(html).toContain('id="board-search"')
    expect(html).toContain("This board is empty")
  })

  it("shows description access outside the app link and omits it without a description", () => {
    const html = renderToStaticMarkup(
      <BoardSearch
        boardName="Home"
        boardNanoid="abcdefgh"
        apps={apps}
        categories={[]}
        user={null}
      />,
    )
    expect(html).toContain('aria-label="About Plex"')
    expect(html).not.toContain('aria-label="About Sonarr"')
    expect(html).toMatch(
      /<a[^>]*href="https:\/\/plex\.example"[^>]*>.*?<\/a><button/,
    )
  })

  it("shows the description info button only on touch, at the bottom left", () => {
    const html = renderToStaticMarkup(
      <BoardSearch
        boardName="Home"
        boardNanoid="abcdefgh"
        apps={apps}
        categories={[]}
        user={null}
      />,
    )
    const button = html.match(/<button[^>]*aria-label="About Plex"[^>]*>/)?.[0]
    expect(button).toBeDefined()
    expect(button).toContain("bottom-1")
    expect(button).toContain("left-1")
    expect(button).toContain("any-pointer:coarse")
    expect(button).not.toContain("right-1")
    expect(button).not.toContain("top-1")
  })

  it("opens the description from tile hover and keyboard focus", () => {
    const open = vi.fn()
    const handlers = descriptionTileHandlers("plex", true, open)

    handlers.onMouseEnter()
    expect(open).toHaveBeenLastCalledWith("plex")
    handlers.onFocus()
    expect(open).toHaveBeenLastCalledWith("plex")

    const emptyHandlers = descriptionTileHandlers("sonarr", false, open)
    emptyHandlers.onMouseEnter()
    emptyHandlers.onFocus()
    expect(open).toHaveBeenCalledTimes(2)
  })

  it("keeps descriptions closed while a tile action is open", () => {
    const open = vi.fn()
    let allowed = false
    const handlers = descriptionTileHandlers("plex", true, open, () => allowed)
    handlers.onMouseEnter()
    handlers.onFocus()
    expect(open).not.toHaveBeenCalled()
    allowed = true
    handlers.onFocus()
    expect(open).toHaveBeenCalledWith("plex")
  })

  it("does not advertise the removed custom keyboard shortcuts", () => {
    const html = renderToStaticMarkup(
      <BoardSearch
        boardName="Home"
        boardNanoid="abcdefgh"
        apps={apps}
        categories={[]}
        user={null}
      />,
    )
    expect(html).not.toMatch(/escape|ctrl|cmd|arrow/i)
  })

  it("shows a category heading without a divider rule", () => {
    const html = renderToStaticMarkup(
      <BoardSearch
        boardName="Home"
        boardNanoid="abcdefgh"
        apps={apps.map((app) => ({ ...app, categoryId: "movies" }))}
        categories={[
          { id: "movies", title: "Movies", description: "Films we watch" },
        ]}
        user={null}
      />,
    )
    const section = html.match(
      /<section[^>]*aria-label="Movies"[\s\S]*?<\/section>/,
    )?.[0]
    expect(section).toBeDefined()
    expect(section).toContain("Movies")
    expect(section).toContain("Films we watch")
    expect(section).not.toContain("border-b")
  })
})
