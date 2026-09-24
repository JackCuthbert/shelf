import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { BoardSearch, descriptionTileHandlers } from "./board-search"

vi.mock("@/components/trpc-provider", () => ({
  trpc: {
    boards: {
      refreshStatuses: {
        useMutation: () => ({ mutateAsync: async () => [] }),
      },
    },
  },
}))

const apps = [
  {
    id: "plex",
    name: "Plex",
    description: "Movies and shows",
    url: "https://plex.example",
    iconSlug: "plex",
    categoryId: null,
    status: "up" as const,
    lastCheckedAt: Date.parse("2026-09-24T00:00:00Z"),
  },
  {
    id: "sonarr",
    name: "Sonarr",
    description: "",
    url: "https://sonarr.example",
    iconSlug: "sonarr",
    categoryId: null,
    status: "unknown" as const,
    lastCheckedAt: null,
  },
]

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
    expect(html).toContain('href="/"')
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
