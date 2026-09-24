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
    expect(html).toContain("repeat(auto-fit,8.5rem)")
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
})
